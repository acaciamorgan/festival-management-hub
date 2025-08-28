const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArchivedData() {
  console.log('Checking archived data for 2024...\n');
  
  const tables = [
    'archived_press_screenings',
    'archived_screener_access',
    'archived_photo_shoots',
    'archived_in_attendance', 
    'archived_red_carpets',
    'archived_special_events'
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('festival_year', 2024)
        .limit(3);
      
      if (error) {
        console.log(`${table}: ERROR - ${error.message}`);
      } else {
        console.log(`${table}: ${count || 0} records for 2024`);
        if (data && data.length > 0) {
          console.log(`  Sample: ${JSON.stringify(data[0], null, 2)}\n`);
        } else {
          console.log(`  No data found for 2024\n`);
        }
      }
    } catch (err) {
      console.log(`${table}: ERROR - ${err.message}\n`);
    }
  }
}

checkArchivedData().then(() => {
  console.log('Archived 2024 data check complete');
}).catch(console.error);