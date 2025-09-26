const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAssociation() {
  // Get Pavo's ID
  const { data: pavo } = await supabase
    .from('guests')
    .select('id, name, films_display')
    .eq('name', 'Pavo Marinković')
    .single();

  if (pavo) {
    console.log(`Guest: ${pavo.name}`);
    console.log(`Films display: "${pavo.films_display}"`);
    
    // Check if association exists
    const { data: existing } = await supabase
      .from('guest_short_films')
      .select('id')
      .eq('guest_id', pavo.id)
      .eq('film_title', 'The Cow')
      .single();

    if (!existing) {
      console.log('Creating guest_short_films association...');
      const { error } = await supabase
        .from('guest_short_films')
        .insert({
          guest_id: pavo.id,
          film_title: 'The Cow'
        });
      
      if (error) {
        console.log('ERROR:', error.message);
      } else {
        console.log('✓ Association created successfully');
      }
    } else {
      console.log('Association already exists');
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('The Cow is part of "Shorts Program 8: Drama"');
  console.log('Screening: 10/25 at 8:00pm');
  console.log('\nBoth guests should now show this screening after refreshing the page.');
}

createAssociation().catch(console.error);
