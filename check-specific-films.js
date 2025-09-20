// Check the exact titles in database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSpecificFilms() {
  console.log('=== CHECKING SPECIFIC FILM TITLES ===')

  // Check for Kidnapping of Arabella
  const { data: arabella } = await supabase
    .from('feature_films')
    .select('title')
    .ilike('title', '%arabella%')

  console.log('Films with "arabella":', arabella)

  // Check for Mysterious Gaze
  const { data: mysterious } = await supabase
    .from('feature_films')
    .select('title')
    .ilike('title', '%mysterious%')

  console.log('Films with "mysterious":', mysterious)

  // Check for Flamingo
  const { data: flamingo } = await supabase
    .from('feature_films')
    .select('title')
    .ilike('title', '%flamingo%')

  console.log('Films with "flamingo":', flamingo)

  // Show all feature films to see what we have
  const { data: allFeatures } = await supabase
    .from('feature_films')
    .select('title')
    .order('title')

  console.log('All feature films:', allFeatures?.map(f => f.title))
}

checkSpecificFilms().catch(console.error)