const { createServerClient } = require('@supabase/ssr')

// Mock cookies for testing
const mockCookieStore = {
  getAll: () => [],
  set: () => {},
}

console.log('Testing SSR Admin Client...')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    cookies: {
      getAll() {
        return mockCookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            mockCookieStore.set(name, value, options)
          )
        } catch {
          // Server Component context
        }
      },
    },
  }
)

async function testSSRAdminAccess() {
  try {
    console.log('\n--- Testing SSR Admin Auth ---')
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('SSR Admin test failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('SSR Admin test successful!')
      console.log('Users found:', data.users.length)
    }
  } catch (err) {
    console.error('Exception during SSR admin test:', err)
  }
}

testSSRAdminAccess()