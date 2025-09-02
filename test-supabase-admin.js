const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'

console.log('Testing Supabase Admin Connection...')
console.log('URL:', supabaseUrl)
console.log('Service Role Key Length:', serviceRoleKey.length)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testAdminAccess() {
  try {
    console.log('\n--- Testing Admin Auth ---')
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Admin test failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('Admin test successful!')
      console.log('Users found:', data.users.length)
    }
  } catch (err) {
    console.error('Exception during admin test:', err)
  }
}

testAdminAccess()