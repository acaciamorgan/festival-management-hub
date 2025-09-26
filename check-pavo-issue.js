const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPavoIssue() {
  console.log('=== CHECKING PAVO MARINKOVIĆ ===\n');

  // Get Pavo's data
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, films_display')
    .ilike('name', '%Pavo%');

  console.log('Found guests with "Pavo" in name:');
  for (const guest of guests || []) {
    console.log(`\nGuest: ${guest.name}`);
    console.log(`ID: ${guest.id}`);
    console.log(`Films Display: "${guest.films_display}"`);
    
    // Check associations
    const { data: shortFilms } = await supabase
      .from('guest_short_films')
      .select('*')
      .eq('guest_id', guest.id);
    
    console.log('Short film associations:', shortFilms || 'None');
    
    // If no association, create it
    if (!shortFilms || shortFilms.length === 0) {
      console.log('\n→ Creating association for The Cow...');
      const { data, error } = await supabase
        .from('guest_short_films')
        .insert({
          guest_id: guest.id,
          film_title: 'The Cow'
        })
        .select();
      
      if (error) {
        console.log('ERROR:', error);
      } else {
        console.log('✓ Created successfully:', data);
      }
    }
  }

  console.log('\n=== VERIFYING BOTH GUESTS ===\n');
  
  const { data: allCowGuests } = await supabase
    .from('guest_short_films')
    .select('guest_id, film_title, guests!inner(name)')
    .eq('film_title', 'The Cow');
  
  console.log('All guests associated with The Cow:');
  for (const assoc of allCowGuests || []) {
    console.log(`- ${assoc.guests.name}`);
  }
}

checkPavoIssue().catch(console.error);
