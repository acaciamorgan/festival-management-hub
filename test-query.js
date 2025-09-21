const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'
)

async function testTheCow() {
  console.log('=== ANALYZING THE COW ===')

  // 1. Check The Cow in short_films
  const { data: shortFilm, error: shortError } = await supabase
    .from('short_films')
    .select('*')
    .eq('title', 'The Cow')
    .single()

  console.log('1. The Cow in short_films:', shortFilm)
  console.log('   Error:', shortError)

  if (shortFilm && shortFilm.shorts_program_id) {
    console.log('   Has shorts_program_id:', shortFilm.shorts_program_id)

    // 2. Check the shorts program
    const { data: shortsProgram, error: programError } = await supabase
      .from('shorts_programs')
      .select('*')
      .eq('id', shortFilm.shorts_program_id)
      .single()

    console.log('2. Shorts program:', shortsProgram)
    console.log('   Error:', programError)

    if (shortsProgram) {
      // 3. Check guests for this shorts program
      const { data: guests, error: guestError } = await supabase
        .from('guest_programs')
        .select('*, guests(*)')
        .eq('program_title', shortsProgram.program_name)

      console.log('3. Guests for program:', guests)
      console.log('   Error:', guestError)

      // 4. Check if program exists in programs table
      const { data: programCard, error: cardError } = await supabase
        .from('programs')
        .select('*')
        .eq('title', shortsProgram.program_name)
        .single()

      console.log('4. Program card:', programCard)
      console.log('   Error:', cardError)

      if (programCard) {
        // 5. Check screenings
        const { data: screenings, error: screeningError } = await supabase
          .from('published_screenings')
          .select('*')
          .eq('film_card_id', programCard.id)

        console.log('5. Screenings:', screenings)
        console.log('   Error:', screeningError)
      }
    }
  }
}

testTheCow().catch(console.error)