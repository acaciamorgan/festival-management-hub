const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

async function checkAllConstraints() {
  console.log('Please run this SQL and share the complete output:\n')
  console.log('----------------------------------------------------------------')
  console.log(`
-- Get ALL constraints on interviews table
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS full_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'interviews'
ORDER BY con.conname;
  `)
  console.log('----------------------------------------------------------------\n')
  console.log('This will show ALL constraints, not just check constraints.')
  console.log('Please share a screenshot of the complete results.')
}

checkAllConstraints()
