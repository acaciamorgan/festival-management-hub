-- Fixed close_festival function
CREATE OR REPLACE FUNCTION close_festival(confirmation_edition integer)
RETURNS jsonb AS $$
DECLARE
  festival_info record;
  archive_year integer;
  archive_exists boolean := false;
  deleted_counts jsonb;
  edition_num integer;
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
  
  edition_num := festival_info.edition_number;
  
  -- Verify confirmation matches current edition
  IF confirmation_edition != edition_num THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Edition confirmation mismatch. Expected: ' || edition_num || ', Got: ' || confirmation_edition
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
  
  -- Count current data before deletion
  SELECT jsonb_build_object(
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
    'published_screenings', (SELECT COUNT(*) FROM published_screenings)
  ) INTO deleted_counts;
  
  -- Begin atomic deletion - DELETE EVERYTHING
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
      edition_number = edition_num + 1,
      start_date = NULL,
      end_date = NULL,
      updated_at = NOW()
    WHERE id = (SELECT id FROM festival_settings ORDER BY created_at DESC LIMIT 1);
    
    -- Return success with details
    RETURN jsonb_build_object(
      'success', true,
      'closed_festival_year', archive_year,
      'closed_festival_edition', edition_num || 'th',
      'closed_festival_name', festival_info.festival_name,
      'next_edition_number', edition_num + 1,
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
$$ LANGUAGE plpgsql;