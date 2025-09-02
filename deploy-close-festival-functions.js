const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployFunctions() {
  console.log('Creating check_archive_status function...')
  
  // Create check_archive_status function
  const checkArchiveStatusSQL = `
-- Function to check if current festival has been archived
CREATE OR REPLACE FUNCTION check_archive_status()
RETURNS jsonb AS $$
DECLARE
  festival_info record;
  archive_year integer;
  archive_exists boolean := false;
  result jsonb;
BEGIN
  -- Get current festival information
  SELECT edition_number, festival_name, start_date, end_date
  INTO festival_info
  FROM festival_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no festival settings found, use defaults
  IF festival_info IS NULL THEN
    festival_info.edition_number := 60;
    festival_info.festival_name := 'Chicago International Film Festival';
    festival_info.start_date := '2024-10-16'::date;
    festival_info.end_date := '2024-10-27'::date;
  END IF;
  
  -- Calculate archive year from start_date
  archive_year := EXTRACT(YEAR FROM festival_info.start_date);
  
  -- Check if archive exists for this year
  SELECT EXISTS(
    SELECT 1 FROM festival_years WHERE year = archive_year
  ) INTO archive_exists;
  
  -- Count current data that needs to be archived
  result := jsonb_build_object(
    'festival_year', archive_year,
    'festival_edition', festival_info.edition_number || 'th',
    'festival_name', festival_info.festival_name,
    'start_date', festival_info.start_date,
    'end_date', festival_info.end_date,
    'is_archived', archive_exists,
    'current_data_counts', jsonb_build_object(
      'feature_films', (SELECT COUNT(*) FROM feature_films),
      'short_films', (SELECT COUNT(*) FROM short_films),
      'programs', (SELECT COUNT(*) FROM programs),
      'press', (SELECT COUNT(*) FROM press),
      'press_screenings', (SELECT COUNT(*) FROM press_screenings),
      'screener_access', (SELECT COUNT(*) FROM screener_access),
      'press_requests', (SELECT COUNT(*) FROM press_requests),
      'photo_shoots', (SELECT COUNT(*) FROM photo_shoots),
      'red_carpets', (SELECT COUNT(*) FROM red_carpets),
      'special_events', (SELECT COUNT(*) FROM special_events),
      'guests', (SELECT COUNT(*) FROM guests),
      'published_screenings', (SELECT COUNT(*) FROM published_screenings),
      'pi_jury_screenings', (SELECT COUNT(*) FROM pi_jury_screenings),
      'tech_check_screenings', (SELECT COUNT(*) FROM tech_check_screenings),
      'film_contacts', (SELECT COUNT(*) FROM film_contacts)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;`

  const { error: checkError } = await supabase.rpc('query_raw', { 
    query: checkArchiveStatusSQL 
  }).single()

  if (checkError) {
    // Try direct execution
    const { data, error } = await supabase.from('_sql').insert({ sql: checkArchiveStatusSQL })
    if (error) {
      console.error('Error creating check_archive_status:', error)
    }
  }

  console.log('Creating close_festival function...')
  
  // Create close_festival function
  const closeFestivalSQL = `
-- Function to safely close/reset the festival
CREATE OR REPLACE FUNCTION close_festival(confirmation_edition integer)
RETURNS jsonb AS $$
DECLARE
  festival_info record;
  archive_year integer;
  archive_exists boolean := false;
  deleted_counts jsonb;
BEGIN
  -- Get current festival information
  SELECT edition_number, festival_name, start_date, end_date
  INTO festival_info
  FROM festival_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no festival settings found, use defaults
  IF festival_info IS NULL THEN
    festival_info.edition_number := 60;
    festival_info.festival_name := 'Chicago International Film Festival';
    festival_info.start_date := '2024-10-16'::date;
    festival_info.end_date := '2024-10-27'::date;
  END IF;
  
  -- Verify confirmation matches current edition
  IF confirmation_edition != festival_info.edition_number THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Edition confirmation mismatch. Expected: ' || festival_info.edition_number || ', Got: ' || confirmation_edition
    );
  END IF;
  
  -- Calculate archive year from start_date
  archive_year := EXTRACT(YEAR FROM festival_info.start_date);
  
  -- Check if archive exists for this year
  SELECT EXISTS(
    SELECT 1 FROM festival_years WHERE year = archive_year
  ) INTO archive_exists;
  
  -- Require archive to exist before closing
  IF NOT archive_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Festival must be archived before closing. Please archive the festival first.'
    );
  END IF;
  
  -- Begin atomic deletion
  BEGIN
    -- Clear all festival data (preserve users, venues, settings structure)
    
    -- Film-related data
    DELETE FROM screener_access;
    DELETE FROM film_contacts;
    DELETE FROM feature_films;
    DELETE FROM short_films;
    DELETE FROM programs;
    
    -- Press-related data
    DELETE FROM press_requests;
    DELETE FROM press_screenings;
    DELETE FROM press;
    
    -- Event-related data
    DELETE FROM photo_shoots;
    DELETE FROM red_carpets;
    DELETE FROM special_events;
    
    -- Screening data
    DELETE FROM pi_jury_screenings;
    DELETE FROM tech_check_screenings;
    DELETE FROM published_screenings;
    
    -- Guest data
    DELETE FROM guests;
    
    -- Update festival settings for next year
    UPDATE festival_settings SET
      edition_number = festival_info.edition_number + 1,
      start_date = NULL,
      end_date = NULL,
      updated_at = NOW()
    WHERE id = (SELECT id FROM festival_settings ORDER BY created_at DESC LIMIT 1);
    
    -- Calculate what was deleted (from archive counts)
    SELECT jsonb_build_object(
      'feature_films', (SELECT COUNT(*) FROM archived_feature_films WHERE festival_year = archive_year),
      'short_films', (SELECT COUNT(*) FROM archived_short_films WHERE festival_year = archive_year),
      'programs', (SELECT COUNT(*) FROM archived_programs WHERE festival_year = archive_year),
      'press', (SELECT COUNT(*) FROM archived_press WHERE festival_year = archive_year),
      'press_screenings', (SELECT COUNT(*) FROM archived_press_screenings WHERE festival_year = archive_year),
      'screener_access', (SELECT COUNT(*) FROM archived_screener_access WHERE festival_year = archive_year),
      'press_requests', (SELECT COUNT(*) FROM archived_press_requests WHERE festival_year = archive_year),
      'photo_shoots', (SELECT COUNT(*) FROM archived_photo_shoots WHERE festival_year = archive_year),
      'red_carpets', (SELECT COUNT(*) FROM archived_red_carpets WHERE festival_year = archive_year),
      'special_events', (SELECT COUNT(*) FROM archived_special_events WHERE festival_year = archive_year),
      'guests', (SELECT COUNT(*) FROM archived_in_attendance WHERE festival_year = archive_year),
      'published_screenings', (SELECT COUNT(*) FROM archived_published_screenings WHERE festival_year = archive_year)
    ) INTO deleted_counts;
    
    RETURN jsonb_build_object(
      'success', true,
      'closed_festival_year', archive_year,
      'closed_festival_edition', festival_info.edition_number || 'th',
      'closed_festival_name', festival_info.festival_name,
      'next_edition_number', festival_info.edition_number + 1,
      'deleted_counts', deleted_counts,
      'closed_at', NOW()
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback happens automatically
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Festival close failed: ' || SQLERRM,
        'error_detail', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;`

  const { error: closeError } = await supabase.rpc('query_raw', { 
    query: closeFestivalSQL 
  }).single()

  if (closeError) {
    // Try direct execution
    const { data, error } = await supabase.from('_sql').insert({ sql: closeFestivalSQL })
    if (error) {
      console.error('Error creating close_festival:', error)
    }
  }

  console.log('Functions deployment attempted. Please check your Supabase dashboard SQL editor to verify.')
  console.log('\nTo deploy manually:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy the contents of create-close-festival-function.sql')
  console.log('4. Execute the SQL')
}

deployFunctions().catch(console.error)