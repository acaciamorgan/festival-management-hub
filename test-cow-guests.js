const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'
)

async function testCowGuests() {
  console.log('=== TESTING COW GUESTS ===')

  // Test the exact query from the modal
  const { data: shortGuests, error } = await supabase
    .from('guests')
    .select(`
      id,
      name,
      role,
      arrival_date,
      departure_date,
      confirmed,
      checked_in
    `)
    .ilike('films_display', `%The Cow%`)

  console.log('Short guests query result:', shortGuests)
  console.log('Error:', error)

  // Also check what's in films_display for these guests
  const { data: allGuests } = await supabase
    .from('guests')
    .select('name, films_display')
    .or('name.ilike.%Stjepan%,name.ilike.%Pavo%')

  console.log('Stjepan and Pavo films_display:', allGuests)
}

testCowGuests().catch(console.error)