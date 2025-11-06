const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

async function applyMigration() {
  console.log('Applying Film Team status migration...\n')

  // Step 1: Drop the old constraint
  console.log('Step 1: Dropping old constraint...')
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;`
  })

  if (dropError) {
    console.error('Error dropping constraint:', dropError)
    console.log('\nTrying alternative approach using direct SQL...\n')

    // Use postgres function
    const { data, error } = await supabase
      .from('interviews')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Cannot access database:', error)
      return
    }

    console.log('Please run this SQL in your Supabase SQL Editor:')
    console.log('----------------------------------------------------')
    console.log(`
-- Drop the old constraint
ALTER TABLE interviews
DROP CONSTRAINT IF EXISTS interviews_status_check;

-- Add the new constraint with 'Film Team' included
ALTER TABLE interviews
ADD CONSTRAINT interviews_status_check
CHECK (status IN ('TBD', 'Pitching', 'Subject Pending', 'Scheduled', 'Film Team', 'Complete', 'Declined'));
    `)
    console.log('----------------------------------------------------')
    console.log('\nGo to: https://supabase.com/dashboard/project/xqzjthbearpqcrzfdfer/sql/new')
    return
  }

  console.log('✓ Old constraint dropped')

  // Step 2: Add the new constraint
  console.log('Step 2: Adding new constraint with Film Team...')
  const { error: addError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE interviews
          ADD CONSTRAINT interviews_status_check
          CHECK (status IN ('TBD', 'Pitching', 'Subject Pending', 'Scheduled', 'Film Team', 'Complete', 'Declined'));`
  })

  if (addError) {
    console.error('Error adding constraint:', addError)
    return
  }

  console.log('✓ New constraint added with Film Team status')
  console.log('\n✅ Migration completed successfully!')
  console.log('You can now use "Film Team" status in interviews.')
}

applyMigration()
