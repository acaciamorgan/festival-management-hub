// Check if "The Cow" exists in database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCowFilm() {
  console.log('=== CHECKING FOR COW FILMS ===')

  // Check feature films
  const { data: featureFilms } = await supabase
    .from('feature_films')
    .select('title')
    .ilike('title', '%cow%')

  console.log('Feature films with "cow":', featureFilms)

  // Check short films
  const { data: shortFilms } = await supabase
    .from('short_films')
    .select('title')
    .ilike('title', '%cow%')

  console.log('Short films with "cow":', shortFilms)

  // Check programs
  const { data: programs } = await supabase
    .from('programs')
    .select('title')
    .ilike('title', '%cow%')

  console.log('Programs with "cow":', programs)

  // Check all short films for Drama category
  const { data: dramaShorts } = await supabase
    .from('short_films')
    .select('title')
    .ilike('title', '%drama%')

  console.log('Short films with "drama":', dramaShorts)
}

checkCowFilm().catch(console.error)