const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCowProgram() {
  console.log('=== CHECKING THE COW SHORTS PROGRAM ===\n');

  // Get The Cow short film details
  const { data: cowShort } = await supabase
    .from('short_films')
    .select('*, shorts_programs(*)')
    .eq('title', 'The Cow')
    .single();

  if (cowShort) {
    console.log('The Cow short film:');
    console.log('- Title:', cowShort.title);
    console.log('- Shorts Program ID:', cowShort.shorts_program_id);
    console.log('- Program:', cowShort.shorts_programs);

    if (cowShort.shorts_programs) {
      console.log('\nChecking screenings for program:', cowShort.shorts_programs.program_name);
      
      const { data: programScreenings } = await supabase
        .from('ticketing_screenings')
        .select('id, film_title, screening_date, start_time')
        .or(`film_title.eq.${cowShort.shorts_programs.program_name},film_title.ilike.%${cowShort.shorts_programs.program_name}%`)
        .order('screening_date');
      
      console.log('Program screenings:', programScreenings || 'No screenings found');
    }
  }

  console.log('\n=== CREATING MISSING ASSOCIATIONS ===\n');
  
  // Get guest IDs
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, films_display')
    .or('name.eq.Pavo Marinković,name.eq.Stjepan Perić');

  console.log('Guests with "The Cow" in films_display:');
  for (const guest of guests || []) {
    console.log(`- ${guest.name}: films_display = "${guest.films_display}"`);
    
    if (guest.films_display?.includes('The Cow')) {
      // Check if association already exists
      const { data: existing } = await supabase
        .from('guest_short_films')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('film_title', 'The Cow')
        .single();

      if (!existing) {
        console.log(`  → Creating guest_short_films association for ${guest.name}`);
        const { error } = await supabase
          .from('guest_short_films')
          .insert({
            guest_id: guest.id,
            film_title: 'The Cow'
          });
        
        if (error) {
          console.log('  ERROR:', error.message);
        } else {
          console.log('  ✓ Association created successfully');
        }
      } else {
        console.log('  → Association already exists');
      }
    }
  }
}

checkCowProgram().catch(console.error);
