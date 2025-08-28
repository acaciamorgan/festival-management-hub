const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function archiveMissingData() {
  console.log('Archiving guests (In Attendance) and published_screenings (Ticketing)...');
  
  try {
    // Archive Guests as In Attendance
    console.log('\nArchiving Guests as In Attendance...');
    const { data: guests } = await supabase
      .from('guests')
      .select('*');
    
    if (guests && guests.length > 0) {
      const archiveData = guests.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        name: item.name,
        film_association: item.films_display || 'Unknown',
        role: item.role || item.guest_type,
        arrival_date: item.arrival_date,
        departure_date: item.departure_date,
        accommodation: item.hotel_name ? `${item.hotel_name}, ${item.hotel_address}` : null,
        contact_email: item.contact_email,
        phone: null,
        special_requirements: item.notes
      }));
      
      const { error } = await supabase
        .from('archived_in_attendance')
        .upsert(archiveData);
      
      if (error) {
        console.error('Guests (In Attendance) archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} guests as In Attendance records`);
      }
    }
    
    // Archive Published Screenings as Ticketing
    console.log('\nArchiving Published Screenings as Ticketing...');
    const { data: publishedScreenings } = await supabase
      .from('published_screenings')
      .select('*');
    
    if (publishedScreenings && publishedScreenings.length > 0) {
      const archiveData = publishedScreenings.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        film_title: item.film_title,
        screening_date: item.screening_date,
        start_time: item.start_time,
        venue_short_code: item.venue_short_code,
        run_time: item.run_time,
        capacity: item.capacity,
        tickets_sold: 0, // No ticket sales data available
        ticket_price: null, // No pricing data available
        notes: item.notes
      }));
      
      const { error } = await supabase
        .from('archived_published_screenings')
        .upsert(archiveData);
      
      if (error) {
        console.error('Published Screenings (Ticketing) archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} published screenings as Ticketing records`);
      }
    }
    
    console.log('\nArchive complete! Checking final counts...');
    
    // Check final counts
    const tables = [
      'archived_in_attendance',
      'archived_published_screenings'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('festival_year', 2024);
      
      if (error) {
        console.log(`${table}: ERROR - ${error.message}`);
      } else {
        console.log(`${table}: ${count || 0} records for 2024`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

archiveMissingData();