const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCowData() {
  console.log('=== CHECKING THE COW DATA ===\n');

  // Check if The Cow exists in any film tables
  console.log('1. Checking feature_films for "The Cow":');
  const { data: featureFilms } = await supabase
    .from('feature_films')
    .select('id, title')
    .ilike('title', '%cow%');
  console.log(featureFilms || 'No results');

  console.log('\n2. Checking short_films for "The Cow":');
  const { data: shortFilms } = await supabase
    .from('short_films')
    .select('id, title')
    .ilike('title', '%cow%');
  console.log(shortFilms || 'No results');

  console.log('\n3. Checking ticketing_screenings for "cow" related screenings:');
  const { data: screenings } = await supabase
    .from('ticketing_screenings')
    .select('id, film_title, screening_date, start_time')
    .ilike('film_title', '%cow%')
    .order('screening_date');
  console.log(screenings || 'No results');

  console.log('\n4. Checking guest_films associations:');
  // Get Pavo and Stjepan's IDs first
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name')
    .or('name.eq.Pavo Marinković,name.eq.Stjepan Perić');
  
  if (guests) {
    for (const guest of guests) {
      console.log(`\n   Guest: ${guest.name} (ID: ${guest.id})`);
      
      const { data: guestFilms } = await supabase
        .from('guest_films')
        .select('film_title')
        .eq('guest_id', guest.id);
      console.log('   guest_films:', guestFilms || 'No associations');

      const { data: guestShortFilms } = await supabase
        .from('guest_short_films')
        .select('film_title')
        .eq('guest_id', guest.id);
      console.log('   guest_short_films:', guestShortFilms || 'No associations');
    }
  }

  console.log('\n5. Checking if "The Cow" title matches exactly in screenings:');
  const { data: exactMatch } = await supabase
    .from('ticketing_screenings')
    .select('id, film_title')
    .eq('film_title', 'The Cow');
  console.log('Exact match for "The Cow":', exactMatch || 'No exact match');
}

checkCowData().catch(console.error);
