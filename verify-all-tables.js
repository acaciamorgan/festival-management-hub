const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
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

  console.log('VERIFYING EACH TABLE:\n');
  const existingTables = [];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0);
    
    if (error) {
      console.log(`❌ ${table} - ERROR: ${error.message}`);
    } else {
      console.log(`✅ ${table} - EXISTS`);
      existingTables.push(table);
    }
  }

  console.log('\n\n=== SQL FOR EXISTING TABLES ONLY ===\n');
  
  for (const table of existingTables) {
    console.log(`CREATE TABLE IF NOT EXISTS archive_2024_${table} AS`);
    console.log(`SELECT * FROM ${table};\n`);
  }
  
  console.log(`-- Create archive registry`);
  console.log(`CREATE TABLE IF NOT EXISTS archive_registry (`);
  console.log(`  year INTEGER PRIMARY KEY,`);
  console.log(`  festival_name TEXT,`);
  console.log(`  edition TEXT,`);
  console.log(`  start_date DATE,`);
  console.log(`  end_date DATE,`);
  console.log(`  archived_at TIMESTAMP DEFAULT NOW()`);
  console.log(`);`);
  console.log();
  console.log(`-- Add 2024 to registry`);
  console.log(`INSERT INTO archive_registry (year, festival_name, edition, start_date, end_date)`);
  console.log(`SELECT 2024, festival_name, edition_number || 'th', start_date, end_date`);
  console.log(`FROM festival_settings`);
  console.log(`LIMIT 1`);
  console.log(`ON CONFLICT (year) DO UPDATE SET archived_at = NOW();`);
}

verifyTables();