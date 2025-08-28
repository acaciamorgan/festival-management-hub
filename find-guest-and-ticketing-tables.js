const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findGuestAndTicketingData() {
  console.log('Looking for guest card and ticketing data...\n');
  
  // Check for guest-related tables
  const possibleGuestTables = [
    'guest_cards',
    'guests',
    'in_attendance', 
    'attendees',
    'guest_list',
    'guest_passes',
    'vip_guests',
    'talent',
    'filmmakers'
  ];
  
  console.log('Checking for guest-related tables:');
  for (const table of possibleGuestTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(2);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`${table}: Table does not exist`);
        } else {
          console.log(`${table}: ERROR - ${error.message}`);
        }
      } else {
        console.log(`${table}: ${count || 0} records`);
        if (data && data.length > 0) {
          console.log(`  Sample columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`${table}: ERROR - ${err.message}`);
    }
  }
  
  console.log('\nChecking for ticketing-related tables:');
  const possibleTicketingTables = [
    'published_screenings',
    'tickets',
    'ticket_sales',
    'screening_tickets',
    'box_office',
    'admissions',
    'screening_attendance'
  ];
  
  for (const table of possibleTicketingTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(2);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`${table}: Table does not exist`);
        } else {
          console.log(`${table}: ERROR - ${error.message}`);
        }
      } else {
        console.log(`${table}: ${count || 0} records`);
        if (data && data.length > 0) {
          console.log(`  Sample columns: ${Object.keys(data[0]).join(', ')}`);
          console.log(`  Sample data: ${JSON.stringify(data[0], null, 2)}`);
        }
      }
    } catch (err) {
      console.log(`${table}: ERROR - ${err.message}`);
    }
  }
}

findGuestAndTicketingData();