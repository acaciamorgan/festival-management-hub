const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVenueCapacity() {
  console.log('=== TESTING VENUE CAPACITY AUTO-FILL ===\n');

  // Simulate exactly what the code does
  console.log('1. Loading theater houses (exactly like the code):');
  const { data: theaterHouses, error } = await supabase
    .from('theater_houses')
    .select('short_code, seat_count, house_name')
    .not('short_code', 'is', null)
    .order('short_code');

  if (error) {
    console.error('ERROR loading theater houses:', error);
    return;
  }

  console.log('Raw theater houses data:');
  theaterHouses.forEach(house => {
    console.log(`  ${house.short_code}: ${house.seat_count} seats (${house.house_name})`);
  });

  console.log('\n2. Processing into uniqueVenues Map (like the code):');
  const uniqueVenues = new Map();

  theaterHouses.forEach(theater => {
    console.log(`Processing: ${theater.short_code} with ${theater.seat_count} seats`);
    if (theater.short_code && theater.seat_count) {
      uniqueVenues.set(theater.short_code, {
        id: theater.short_code,
        short_code: theater.short_code,
        display_name: theater.short_code,
        capacity: theater.seat_count,
        house_name: theater.house_name
      });
      console.log(`  ✓ Added to map: ${theater.short_code} = ${theater.seat_count}`);
    } else {
      console.log(`  ✗ Skipped (missing short_code or seat_count)`);
    }
  });

  console.log('\n3. Final venueCards array:');
  const venueCards = Array.from(uniqueVenues.values());
  venueCards.forEach(venue => {
    console.log(`  ${venue.short_code}: capacity = ${venue.capacity}`);
  });

  console.log('\n4. Test specific venue lookup:');
  const testVenue = venueCards.find(v => v.short_code === 'AMC 4');
  if (testVenue) {
    console.log(`AMC 4 found: capacity = ${testVenue.capacity}`);
  } else {
    console.log('AMC 4 NOT found in venueCards array');
  }

  console.log('\n5. Test filtering (what happens when user types "AMC"):');
  const filtered = venueCards.filter(venue => 
    venue.short_code.toLowerCase().includes('amc')
  ).slice(0, 5);
  
  console.log('Filtered venues for "amc":');
  filtered.forEach(venue => {
    console.log(`  ${venue.short_code}: capacity = ${venue.capacity}`);
  });
}

testVenueCapacity().catch(console.error);
