const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScreeningTitles() {
  console.log('=== CHECKING ALL SCREENING TITLES FOR POTENTIAL MATCHES ===\n');

  // Get all distinct film titles from ticketing_screenings
  const { data: screenings, error } = await supabase
    .from('ticketing_screenings')
    .select('film_title, screening_date, start_time, venue_short_code, is_published')
    .order('film_title');

  if (error) {
    console.error('Error loading screenings:', error);
    return;
  }

  // Look for anything that might be related to Primavera
  console.log('SEARCHING FOR PRIMAVERA-RELATED TITLES:');
  const primaveraRelated = screenings.filter(s => 
    s.film_title.toLowerCase().includes('primavera') ||
    s.film_title.toLowerCase().includes('spring') ||
    s.film_title.toLowerCase().includes('prima')
  );

  if (primaveraRelated.length > 0) {
    console.log('Found potentially related screenings:');
    primaveraRelated.forEach(s => {
      console.log('  - "' + s.film_title + '" on ' + s.screening_date + ' at ' + s.start_time + ' (' + s.venue_short_code + ')');
    });
  } else {
    console.log('No Primavera-related titles found in screenings.');
  }

  // Show all unique film titles to help identify the issue
  console.log('\n=== ALL UNIQUE FILM TITLES IN TICKETING_SCREENINGS ===');
  const uniqueTitles = [...new Set(screenings.map(s => s.film_title))].sort();
  console.log('Total unique titles: ' + uniqueTitles.length);
  console.log('\nAll film titles:');
  uniqueTitles.forEach(title => {
    console.log('  - "' + title + '"');
  });

  // Check if there are any titles with special characters or encoding issues
  console.log('\n=== CHECKING FOR TITLE ENCODING ISSUES ===');
  const suspiciousTitles = uniqueTitles.filter(title => 
    title.includes('�') || 
    title.includes('&') || 
    title.includes('&amp;') ||
    title.match(/[^\x00-\x7F]/) // Non-ASCII characters
  );

  if (suspiciousTitles.length > 0) {
    console.log('Found titles with potential encoding issues:');
    suspiciousTitles.forEach(title => {
      console.log('  - "' + title + '"');
    });
  } else {
    console.log('No obvious encoding issues detected.');
  }
}

checkScreeningTitles().catch(console.error);
