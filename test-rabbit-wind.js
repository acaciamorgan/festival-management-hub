// Test the specific failing cases
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFilms() {
  console.log('=== CHECKING RABBIT AND WIND FILMS ===')

  // Check for rabbit films
  const { data: rabbitFilms } = await supabase
    .from('feature_films')
    .select('title')
    .or('title.ilike.%rabbit%,title.ilike.%black%,title.ilike.%white%')

  console.log('Rabbit/Black/White films:', rabbitFilms)

  // Check for wind films
  const { data: windFilms } = await supabase
    .from('feature_films')
    .select('title')
    .or('title.ilike.%wind%,title.ilike.%talk%')

  console.log('Wind/Talk films:', windFilms)

  // Check short films too
  const { data: shortRabbitFilms } = await supabase
    .from('short_films')
    .select('title')
    .or('title.ilike.%rabbit%,title.ilike.%black%,title.ilike.%white%')

  console.log('Short Rabbit/Black/White films:', shortRabbitFilms)

  const { data: shortWindFilms } = await supabase
    .from('short_films')
    .select('title')
    .or('title.ilike.%wind%,title.ilike.%talk%')

  console.log('Short Wind/Talk films:', shortWindFilms)
}

checkFilms().catch(console.error)