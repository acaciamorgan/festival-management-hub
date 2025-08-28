const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runArchiveFunction() {
  console.log('Running updated archive function...');
  
  try {
    const { data, error } = await supabase.rpc('archive_current_festival');
    
    if (error) {
      console.error('Archive function error:', error);
      return;
    }
    
    console.log('Archive result:', JSON.stringify(data, null, 2));
    
    // Now check if the new tables have data
    console.log('\nChecking archived data after running archive function...');
    
    const tables = [
      'archived_press_screenings',
      'archived_screener_access', 
      'archived_photo_shoots',
      'archived_in_attendance',
      'archived_red_carpets',
      'archived_special_events'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('festival_year', 2024);
      
      if (error) {
        console.log(`${table}: ERROR - ${error.message}`);
      } else {
        console.log(`${table}: ${count || 0} records for 2024`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

runArchiveFunction();