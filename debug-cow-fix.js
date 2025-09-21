const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'
)

async function debugCowFix() {
  console.log('=== DEBUGGING COW FIX ===')

  // 1. Get The Cow short film data
  const { data: shortFilm, error: shortError } = await supabase
    .from('short_films')
    .select('*')
    .eq('title', 'The Cow')
    .single()

  console.log('1. The Cow short film:', shortFilm)
  console.log('   shorts_program_id:', shortFilm?.shorts_program_id)

  if (shortFilm && shortFilm.shorts_program_id) {
    // 2. Get the shorts program
    const { data: shortsProgram, error: programError } = await supabase
      .from('shorts_programs')
      .select('*')
      .eq('id', shortFilm.shorts_program_id)
      .single()

    console.log('2. Shorts program:', shortsProgram)
    console.log('   program_name:', shortsProgram?.program_name)

    // 3. Check guests for The Cow directly
    const { data: guestFilms, error: guestError } = await supabase
      .from('guest_films')
      .select('*, guests(*)')
      .eq('film_id', shortFilm.id)

    console.log('3. Guests for The Cow:', guestFilms)
    console.log('   Error:', guestError)

    // 4. Check screenings using exact program name
    if (shortsProgram) {
      const { data: screenings, error: screeningError } = await supabase
        .from('ticketing_screenings')
        .select('*')
        .eq('film_title', shortsProgram.program_name)

      console.log('4. Screenings for program name "' + shortsProgram.program_name + '":', screenings)
      console.log('   Error:', screeningError)

      // 5. Also search for variations
      const { data: allScreenings } = await supabase
        .from('ticketing_screenings')
        .select('film_title')
        .limit(20)

      console.log('5. Sample film titles in ticketing_screenings:', allScreenings?.map(s => s.film_title))
    }
  }
}

debugCowFix().catch(console.error)