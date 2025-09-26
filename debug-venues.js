const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVenues() {
  console.log('=== CHECKING THEATER HOUSES CAPACITY DATA ===\n');

  // Check theater_houses table for capacity data
  const { data: theaterHouses, error } = await supabase
    .from('theater_houses')
    .select('short_code, seat_count, house_name')
    .not('short_code', 'is', null)
    .order('short_code');

  if (error) {
    console.error('Error loading theater houses:', error);
    return;
  }

  console.log('Theater Houses with capacity data:');
  theaterHouses.forEach(house => {
    console.log(`- ${house.short_code}: ${house.seat_count} seats (${house.house_name})`);
  });

  console.log('\n=== PROCESSED VENUE DATA (as code does) ===\n');

  // Process venues like the code does
  const uniqueVenues = new Map();

  theaterHouses.forEach(theater => {
    if (theater.short_code && theater.seat_count) {
      uniqueVenues.set(theater.short_code, {
        id: theater.short_code,
        short_code: theater.short_code,
        display_name: theater.short_code,
        capacity: theater.seat_count,
        house_name: theater.house_name
      });
    }
  });

  const processedVenues = Array.from(uniqueVenues.values());
  console.log('Processed venues with capacity:');
  processedVenues.forEach(venue => {
    console.log(`- ${venue.short_code}: ${venue.capacity} capacity (${venue.house_name})`);
  });

  if (processedVenues.length === 0) {
    console.log('❌ NO VENUES WITH CAPACITY FOUND!');
    console.log('This explains why capacity auto-fill is not working.');
  } else {
    console.log(`✓ Found ${processedVenues.length} venues with capacity data.`);
  }
}

debugVenues().catch(console.error);
