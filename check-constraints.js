const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

async function checkConstraints() {
  console.log('Checking all constraints on interviews table...\n')

  // Query to get all check constraints on the interviews table
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          con.conname AS constraint_name,
          pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
        WHERE rel.relname = 'interviews'
          AND con.contype = 'c'
        ORDER BY con.conname;
      `
    })

  if (error) {
    console.error('Error querying constraints:', error)
    console.log('\nTrying alternative query...\n')

    // Alternative: use a simple query to check if we can see table structure
    const { data: tables, error: tableError } = await supabase
      .from('interviews')
      .select('*')
      .limit(0)

    if (tableError) {
      console.error('Error accessing table:', tableError)
    }

    console.log('Please run this SQL in your Supabase SQL Editor to see constraints:')
    console.log('--------------------------------------------------------------------')
    console.log(`
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'interviews'
  AND con.contype = 'c'
ORDER BY con.conname;
    `)
    console.log('--------------------------------------------------------------------')
    return
  }

  console.log('Constraints found:')
  console.log(data)
}

checkConstraints()
