const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking archive tables...\n');
  
  // Check festival_years
  const { data: years, error: yearsError } = await supabase
    .from('festival_years')
    .select('*');
  
  if (yearsError) {
    console.log('❌ festival_years table: ERROR -', yearsError.message);
  } else {
    console.log('✅ festival_years table exists with', years?.length || 0, 'records');
  }
  
  // Check archive_festival_settings
  const { data: settings, error: settingsError } = await supabase
    .from('archive_festival_settings')
    .select('*');
    
  if (settingsError) {
    console.log('❌ archive_festival_settings table: ERROR -', settingsError.message);
  } else {
    console.log('✅ archive_festival_settings exists with', settings?.length || 0, 'records');
  }
  
  // Check if archive function exists
  console.log('\nTrying to get archive stats...');
  const { data: stats, error: statsError } = await supabase.rpc('get_archive_stats');
  
  if (statsError) {
    console.log('❌ get_archive_stats function: ERROR -', statsError.message);
  } else {
    console.log('✅ Archive stats:', JSON.stringify(stats, null, 2));
  }
}

checkTables();