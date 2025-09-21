const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'
)

async function analyzeScreenings() {
  console.log('=== ANALYZING SCREENING TABLES ===')

  // 1. Check ticketing_screenings structure and sample data
  const { data: ticketingScreenings, error: ticketingError } = await supabase
    .from('ticketing_screenings')
    .select('*')
    .limit(3)

  console.log('1. ticketing_screenings sample:', ticketingScreenings)
  console.log('   Error:', ticketingError)

  // 2. Check published_screenings structure and sample data
  const { data: publishedScreenings, error: publishedError } = await supabase
    .from('published_screenings')
    .select('*')
    .limit(3)

  console.log('2. published_screenings sample:', publishedScreenings)
  console.log('   Error:', publishedError)

  // 3. Check if any screenings reference "Shorts Program 8: Drama" or "The Cow"
  const { data: cowScreenings1, error: cowError1 } = await supabase
    .from('ticketing_screenings')
    .select('*')
    .ilike('film_title', '%cow%')

  console.log('3. ticketing_screenings for cow:', cowScreenings1)

  const { data: cowScreenings2, error: cowError2 } = await supabase
    .from('ticketing_screenings')
    .ilike('film_title', '%shorts program 8%')

  console.log('4. ticketing_screenings for shorts program 8:', cowScreenings2)

  const { data: dramScreenings, error: dramError } = await supabase
    .from('ticketing_screenings')
    .ilike('film_title', '%drama%')

  console.log('5. ticketing_screenings for drama:', dramScreenings)

  // 6. Check what film titles exist in ticketing_screenings
  const { data: allFilmTitles, error: titlesError } = await supabase
    .from('ticketing_screenings')
    .select('film_title')
    .not('film_title', 'is', null)
    .limit(10)

  console.log('6. Sample film titles in ticketing_screenings:', allFilmTitles)
}

analyzeScreenings().catch(console.error)