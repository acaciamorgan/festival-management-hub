const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShortFilmsColumns() {
  console.log('Checking short_films table structure...\n');
  
  const { data, error } = await supabase
    .from('short_films')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('ALL COLUMNS in short_films:');
    console.log('================================');
    columns.forEach(col => console.log(`- ${col}`));
    
    console.log('\n\nSample data:');
    console.log('=============');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data in short_films table');
  }
}

checkShortFilmsColumns();