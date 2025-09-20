const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTable() {
  console.log('Creating csv_title_mappings table...')

  const { data, error } = await supabase
    .from('_sql')
    .insert({
      sql: `
        CREATE TABLE IF NOT EXISTS csv_title_mappings (
          id SERIAL PRIMARY KEY,
          csv_title TEXT NOT NULL,
          database_title TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(csv_title)
        );

        CREATE INDEX IF NOT EXISTS idx_csv_title_mappings_csv_title
        ON csv_title_mappings(csv_title);
      `
    })

  if (error) {
    console.error('Error creating table:', error)
  } else {
    console.log('Table created successfully')
  }
}

createTable().catch(console.error)