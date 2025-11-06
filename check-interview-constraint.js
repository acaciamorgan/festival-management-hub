const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

async function checkAndFixConstraint() {
  console.log('Checking interview status constraint...')

  // Try to update an interview to 'Film Team' status
  const { data: interviews, error: fetchError } = await supabase
    .from('interviews')
    .select('id, status')
    .limit(1)

  if (fetchError) {
    console.error('Error fetching interviews:', fetchError)
    return
  }

  if (interviews && interviews.length > 0) {
    const testInterview = interviews[0]
    console.log(`Testing with interview: ${testInterview.id}`)
    console.log(`Current status: ${testInterview.status}`)

    // Try to update to Film Team
    const { data, error } = await supabase
      .from('interviews')
      .update({ status: 'Film Team' })
      .eq('id', testInterview.id)
      .select()

    if (error) {
      console.error('Error updating to Film Team:', error.message)
      console.log('\nThe constraint needs to be updated. Run the migration:')
      console.log('add-film-team-status-to-interviews.sql')
    } else {
      console.log('✓ Successfully updated to Film Team status!')
      console.log('The constraint is correctly configured.')

      // Restore original status
      await supabase
        .from('interviews')
        .update({ status: testInterview.status })
        .eq('id', testInterview.id)
      console.log(`Restored original status: ${testInterview.status}`)
    }
  } else {
    console.log('No interviews found in database to test with')
  }
}

checkAndFixConstraint()
