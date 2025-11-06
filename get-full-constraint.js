const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

async function getConstraint() {
  // First, let's just try updating directly to see the exact error
  const { data: interviews, error: fetchError } = await supabase
    .from('interviews')
    .select('id, status')
    .limit(1)

  if (fetchError) {
    console.error('Error fetching:', fetchError)
    return
  }

  if (interviews && interviews.length > 0) {
    const interview = interviews[0]

    console.log('Current interview:')
    console.log(`  ID: ${interview.id}`)
    console.log(`  Status: ${interview.status}`)
    console.log('\nAttempting to update to "Film Team"...\n')

    const { data, error } = await supabase
      .from('interviews')
      .update({ status: 'Film Team' })
      .eq('id', interview.id)
      .select()

    if (error) {
      console.error('Error details:')
      console.error('  Code:', error.code)
      console.error('  Message:', error.message)
      console.error('  Details:', error.details)
      console.error('  Hint:', error.hint)

      // Try to get the exact constraint definition
      console.log('\n\nPlease copy and run this SQL to see the exact constraint:')
      console.log('----------------------------------------------------------------')
      console.log(`
SELECT
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'interviews_status_check';
      `)
      console.log('----------------------------------------------------------------')
    } else {
      console.log('✅ SUCCESS! Status updated to Film Team')
      console.log('Data:', data)
    }
  }
}

getConstraint()
