const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function manuallyArchiveMissingData() {
  console.log('Manually archiving missing module data for 2024...');
  
  try {
    // Archive Press Screenings
    console.log('\nArchiving Press Screenings...');
    const { data: pressScreenings } = await supabase
      .from('press_screenings')
      .select('*');
    
    if (pressScreenings && pressScreenings.length > 0) {
      const archiveData = pressScreenings.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        film_title: item.title || 'Unknown',
        screening_date: item.screening_date,
        start_time: item.screening_time,
        venue: item.short_code || 'Unknown',
        notes: item.notes
      }));
      
      const { error } = await supabase
        .from('archived_press_screenings')
        .upsert(archiveData);
      
      if (error) {
        console.error('Press Screenings archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} press screenings`);
      }
    }
    
    // Archive Screener Access
    console.log('\nArchiving Screener Access...');
    const { data: screenerAccess } = await supabase
      .from('screener_access')
      .select('*');
    
    if (screenerAccess && screenerAccess.length > 0) {
      const archiveData = screenerAccess.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        film_id: item.film_id,
        access_type: item.access_type
      }));
      
      const { error } = await supabase
        .from('archived_screener_access')
        .upsert(archiveData);
      
      if (error) {
        console.error('Screener Access archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} screener access records`);
      }
    }
    
    // Archive Photo Shoots
    console.log('\nArchiving Photo Shoots...');
    const { data: photoShoots } = await supabase
      .from('photo_shoots')
      .select('*');
    
    if (photoShoots && photoShoots.length > 0) {
      const archiveData = photoShoots.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        film_title: item.film_program_display || 'Unknown',
        talent_names: item.subjects_display || 'Unknown',
        photographer: item.photographer,
        shoot_date: item.shoot_date,
        shoot_time: item.shoot_time,
        location: item.house || 'Unknown Venue',
        status: item.selects_received ? 'completed' : 'pending',
        notes: item.intro_qa ? `Intro/Q&A: ${item.intro_qa}` : null
      }));
      
      const { error } = await supabase
        .from('archived_photo_shoots')
        .upsert(archiveData);
      
      if (error) {
        console.error('Photo Shoots archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} photo shoots`);
      }
    }
    
    // Archive In Attendance (using film_contacts)
    console.log('\nArchiving In Attendance (from film_contacts)...');
    const { data: filmContacts } = await supabase
      .from('film_contacts')
      .select(`
        *,
        feature_films(title),
        short_films(title),
        programs(title)
      `);
    
    if (filmContacts && filmContacts.length > 0) {
      const archiveData = filmContacts.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        name: item.name,
        film_association: item.feature_films?.title || item.short_films?.title || item.programs?.title || 'Unknown Film',
        role: item.contact_type,
        contact_email: item.email,
        phone: item.phone
      }));
      
      const { error } = await supabase
        .from('archived_in_attendance')
        .upsert(archiveData);
      
      if (error) {
        console.error('In Attendance archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} in attendance records`);
      }
    }
    
    // Archive Red Carpets
    console.log('\nArchiving Red Carpets...');
    const { data: redCarpets } = await supabase
      .from('red_carpets')
      .select('*');
    
    if (redCarpets && redCarpets.length > 0) {
      const archiveData = redCarpets.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        event_name: 'Red Carpet Event',
        film_title: item.film_program_display || 'Unknown',
        event_date: item.carpet_date,
        event_time: item.carpet_start_time,
        venue: item.house || 'Main Venue',
        talent_names: item.subjects_display,
        notes: `Call: ${item.call_time || 'TBD'}, Film: ${item.film_program_start_time || 'TBD'}`
      }));
      
      const { error } = await supabase
        .from('archived_red_carpets')
        .upsert(archiveData);
      
      if (error) {
        console.error('Red Carpets archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} red carpet events`);
      }
    }
    
    // Archive Special Events
    console.log('\nArchiving Special Events...');
    const { data: specialEvents } = await supabase
      .from('special_events')
      .select('*');
    
    if (specialEvents && specialEvents.length > 0) {
      const archiveData = specialEvents.map(item => ({
        original_id: item.id,
        festival_year: 2024,
        event_name: item.title,
        event_type: item.event_type,
        event_date: item.event_date,
        start_time: item.start_time,
        end_time: item.end_time,
        venue: item.venue_name,
        capacity: parseInt(item.number_expected) || 0,
        description: item.location_details,
        organizer: item.lead_staff,
        notes: `Food: ${item.food || 'TBD'}, Beverages: ${item.beverages || 'TBD'}`
      }));
      
      const { error } = await supabase
        .from('archived_special_events')
        .upsert(archiveData);
      
      if (error) {
        console.error('Special Events archive error:', error);
      } else {
        console.log(`Archived ${archiveData.length} special events`);
      }
    }
    
    console.log('\nManual archive complete! Checking final counts...');
    
    // Check final counts
    const tables = [
      'archived_press_screenings',
      'archived_screener_access', 
      'archived_photo_shoots',
      'archived_in_attendance',
      'archived_red_carpets',
      'archived_special_events'
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

manuallyArchiveMissingData();