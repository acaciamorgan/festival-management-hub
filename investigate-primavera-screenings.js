const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigatePrimavera() {
  console.log('=== INVESTIGATING PRIMAVERA SCREENING LINKAGE ===\n');

  // 1. Check if Primavera exists as a film card
  console.log('1. CHECKING PRIMAVERA FILM CARD:');
  const { data: filmCards, error: filmError } = await supabase
    .from('feature_films')
    .select('*')
    .ilike('title', '%primavera%');

  if (filmError) {
    console.error('Error checking feature films:', filmError);
    return;
  }

  if (filmCards && filmCards.length > 0) {
    filmCards.forEach(film => {
      console.log('✓ Found film: "' + film.title + '" (ID: ' + film.id + ')');
      console.log('  - Director: ' + (film.director || 'N/A'));
      console.log('  - Genre: ' + (film.genre || 'N/A'));
    });
  } else {
    console.log('❌ No film card found for Primavera in feature_films');
  }

  // 2. Check ticketing screenings for Primavera
  console.log('\n2. CHECKING TICKETING SCREENINGS FOR PRIMAVERA:');
  const { data: screenings, error: screeningError } = await supabase
    .from('ticketing_screenings')
    .select('*')
    .ilike('film_title', '%primavera%')
    .order('screening_date');

  if (screeningError) {
    console.error('Error checking screenings:', screeningError);
    return;
  }

  if (screenings && screenings.length > 0) {
    console.log('✓ Found ' + screenings.length + ' screenings:');
    screenings.forEach(screening => {
      console.log('  - "' + screening.film_title + '" on ' + screening.screening_date + ' at ' + screening.start_time);
      console.log('    Venue: ' + screening.venue_short_code + ', Published: ' + screening.is_published + ', ID: ' + screening.id);
    });
  } else {
    console.log('❌ No screenings found for Primavera');
  }

  // 3. Check if there's a title mismatch
  console.log('\n3. TITLE MATCHING ANALYSIS:');
  if (filmCards && filmCards.length > 0 && screenings && screenings.length > 0) {
    const filmTitle = filmCards[0].title;
    const screeningTitles = [...new Set(screenings.map(s => s.film_title))];
    
    console.log('Film card title: "' + filmTitle + '"');
    console.log('Screening titles: ' + screeningTitles.map(t => '"' + t + '"').join(', '));
    
    if (screeningTitles.some(screeningTitle => screeningTitle.toLowerCase() === filmTitle.toLowerCase())) {
      console.log('✓ EXACT MATCH FOUND');
    } else {
      console.log('❌ NO EXACT MATCH - This is likely the issue!');
      
      // Check for similar matches
      screeningTitles.forEach(screeningTitle => {
        if (screeningTitle.toLowerCase().includes(filmTitle.toLowerCase()) || 
            filmTitle.toLowerCase().includes(screeningTitle.toLowerCase())) {
          console.log('  → Potential partial match: "' + screeningTitle + '" ≈ "' + filmTitle + '"');
        }
      });
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const hasFilmCard = filmCards && filmCards.length > 0;
  const hasScreenings = screenings && screenings.length > 0;
  
  if (hasFilmCard && hasScreenings) {
    console.log('✓ Both film card and screenings exist');
    console.log('The issue is likely a TITLE MISMATCH between the film card and screening titles.');
  } else if (!hasFilmCard) {
    console.log('❌ No film card found - screenings cannot link to non-existent film');
  } else if (!hasScreenings) {
    console.log('❌ No screenings found - nothing to link to film card');
  }
}

investigatePrimavera().catch(console.error);
