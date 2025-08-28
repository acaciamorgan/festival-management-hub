const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPressTables() {
  console.log('Checking press-related tables:\n');
  
  // Check press table
  const { data: pressData, error: pressError } = await supabase
    .from('press')
    .select('*')
    .limit(1);
  
  if (pressError) {
    console.log('❌ press table: ' + pressError.message);
  } else {
    console.log('✅ press table exists');
  }
  
  // Check press_journalists table
  const { data: journalistsData, error: journalistsError } = await supabase
    .from('press_journalists')
    .select('*')
    .limit(1);
  
  if (journalistsError) {
    console.log('❌ press_journalists table: ' + journalistsError.message);
  } else {
    console.log('✅ press_journalists table exists');
  }
  
  // List all table names from information schema
  console.log('\nFetching all table names from database schema...');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables_list', {});
  
  if (tablesError) {
    // Try a different approach - query a known table to verify connection
    console.log('Could not fetch table list, checking individual tables...');
    
    const tablesToCheck = [
      'press',
      'press_journalist',
      'press_journalists', 
      'journalist',
      'journalists',
      'press_management'
    ];
    
    for (const table of tablesToCheck) {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (!error) {
        console.log(`Found table: ${table}`);
      }
    }
  } else {
    console.log('Tables in database:', tables);
  }
}

checkPressTables();