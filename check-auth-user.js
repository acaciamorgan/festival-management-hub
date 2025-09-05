const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkAuthUser() {
  try {
    console.log('Checking auth.users for maggie@teamacacia.com...')
    
    // List all users and find maggie
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error listing users:', error)
      return
    }
    
    const maggieUser = users.find(u => u.email === 'maggie@teamacacia.com')
    
    if (maggieUser) {
      console.log('Found in auth.users:')
      console.log('- id:', maggieUser.id)
      console.log('- email:', maggieUser.email)
      console.log('- email_confirmed_at:', maggieUser.email_confirmed_at)
      console.log('- created_at:', maggieUser.created_at)
      console.log('- user_metadata:', JSON.stringify(maggieUser.user_metadata, null, 2))
    } else {
      console.log('NOT found in auth.users')
    }
    
  } catch (err) {
    console.error('Script error:', err)
  }
}

checkAuthUser()