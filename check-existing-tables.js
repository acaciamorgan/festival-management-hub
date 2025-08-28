const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tablesToCheck = [
    'festival_settings',
    'feature_films',
    'short_films',
    'programs',
    'press',
    'press_journalists',
    'press_screenings',
    'press_requests',
    'screener_access',
    'photo_shoots',
    'red_carpets',
    'special_events',
    'published_screenings',
    'pi_jury_screenings',
    'tech_check_screenings',
    'film_contacts',
    'venues',
    'screening_invitations',
    'reports_analytics'
  ];

  console.log('Checking which tables exist in the database...\n');
  console.log('EXISTING TABLES:');
  console.log('================');

  const existingTables = [];

  for (const table of tablesToCheck) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✓ ${table}`);
      existingTables.push(table);
    }
  }

  console.log('\n\nSQL to archive existing tables:');
  console.log('================================\n');

  // Generate SQL only for existing tables
  for (const table of existingTables) {
    console.log(`CREATE TABLE IF NOT EXISTS archive_2024_${table} AS`);
    console.log(`SELECT * FROM ${table};\n`);
  }

  // Add registry table
  console.log(`-- Create archive registry`);
  console.log(`CREATE TABLE IF NOT EXISTS archive_registry (`);
  console.log(`  year INTEGER PRIMARY KEY,`);
  console.log(`  festival_name TEXT,`);
  console.log(`  edition TEXT,`);
  console.log(`  start_date DATE,`);
  console.log(`  end_date DATE,`);
  console.log(`  archived_at TIMESTAMP DEFAULT NOW()`);
  console.log(`);`);
}

checkTables();