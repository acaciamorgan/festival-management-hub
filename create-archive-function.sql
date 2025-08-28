-- Archive Function: Copies current festival data to archive tables
-- This function preserves current data (does not delete)
-- A separate reset function will be created to clear current tables

CREATE OR REPLACE FUNCTION archive_current_festival()
RETURNS jsonb AS $$
DECLARE
  festival_info record;
  archive_year integer;
  archive_stats jsonb;
  feature_count integer := 0;
  short_count integer := 0;
  program_count integer := 0;
  press_count integer := 0;
  screening_count integer := 0;
  request_count integer := 0;
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
  
  -- Create or update festival year record
  INSERT INTO festival_years (year, edition, festival_name, start_date, end_date)
  VALUES (
    archive_year,
    festival_info.edition_number::text || 
    CASE 
      WHEN festival_info.edition_number % 100 BETWEEN 11 AND 13 THEN 'th'
      WHEN festival_info.edition_number % 10 = 1 THEN 'st'
      WHEN festival_info.edition_number % 10 = 2 THEN 'nd'
      WHEN festival_info.edition_number % 10 = 3 THEN 'rd'
      ELSE 'th'
    END,
    festival_info.festival_name,
    festival_info.start_date,
    festival_info.end_date
  )
  ON CONFLICT (year) DO UPDATE SET
    edition = EXCLUDED.edition,
    festival_name = EXCLUDED.festival_name,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    archived_at = NOW();
  
  -- Archive Feature Films
  INSERT INTO archived_feature_films (
    original_id, festival_year, title, director, producer, year, runtime, 
    countries, language, color_or_bw, synopsis, submission_id, program_designation,
    aspect_ratio, sound_format, film_format, source_format, screening_format,
    subtitles, subtitles_format
  )
  SELECT 
    id, archive_year, title, director, producer, year, runtime,
    countries, language, color_or_bw, synopsis, submission_id, program_designation,
    aspect_ratio, sound_format, film_format, source_format, screening_format,
    subtitles, subtitles_format
  FROM feature_films
  WHERE id NOT IN (
    SELECT original_id FROM archived_feature_films 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS feature_count = ROW_COUNT;
  
  -- Archive Short Films
  INSERT INTO archived_short_films (
    original_id, festival_year, title, director, producer, year, runtime,
    countries, language, color_or_bw, synopsis, shorts_program_name,
    aspect_ratio, sound_format, film_format, source_format, screening_format, subtitles
  )
  SELECT 
    id, archive_year, title, director, producer, year, runtime,
    countries, language, color_or_bw, synopsis, shorts_program_name,
    aspect_ratio, sound_format, film_format, source_format, screening_format, subtitles
  FROM short_films
  WHERE id NOT IN (
    SELECT original_id FROM archived_short_films 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS short_count = ROW_COUNT;
  
  -- Archive Programs
  INSERT INTO archived_programs (original_id, festival_year, title, description, program_type)
  SELECT id, archive_year, title, description, program_type
  FROM programs
  WHERE id NOT IN (
    SELECT original_id FROM archived_programs 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS program_count = ROW_COUNT;
  
  -- Archive Press
  INSERT INTO archived_press (
    original_id, festival_year, name, media_outlet, email, phone, 
    website, twitter, instagram, bio
  )
  SELECT id, archive_year, name, media_outlet, email, phone, website, twitter, instagram, bio
  FROM press
  WHERE id NOT IN (
    SELECT original_id FROM archived_press 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS press_count = ROW_COUNT;
  
  -- Archive Press Screenings (map current table structure)
  INSERT INTO archived_press_screenings (
    original_id, festival_year, film_title, screening_date, start_time, 
    venue, capacity, notes
  )
  SELECT id, archive_year, title, screening_date, screening_time, short_code, 0, notes
  FROM press_screenings
  WHERE id NOT IN (
    SELECT original_id FROM archived_press_screenings 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Screener Access
  INSERT INTO archived_screener_access (original_id, festival_year, film_id, film_title, access_type)
  SELECT sa.id, archive_year, sa.film_id, 
    COALESCE(ff.title, sf.title, p.title) as film_title,
    sa.access_type
  FROM screener_access sa
  LEFT JOIN feature_films ff ON sa.film_id = ff.id
  LEFT JOIN short_films sf ON sa.film_id = sf.id  
  LEFT JOIN programs p ON sa.film_id = p.id
  WHERE sa.id NOT IN (
    SELECT original_id FROM archived_screener_access 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Press Requests
  INSERT INTO archived_press_requests (
    original_id, festival_year, requester_name, requester_outlet, requester_email,
    request_type, film_titles, screening_id, screening_type, screening_date, 
    screening_time, venue_short_code, status, requested_at, fulfilled_at, 
    created_at, created_by
  )
  SELECT 
    id, archive_year, requester_name, requester_outlet, requester_email,
    request_type, film_titles, screening_id, screening_type, screening_date,
    screening_time, venue_short_code, status, requested_at, fulfilled_at,
    created_at, created_by
  FROM press_requests
  WHERE id NOT IN (
    SELECT original_id FROM archived_press_requests 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS request_count = ROW_COUNT;
  
  -- Archive Photo Shoots (map current table structure)
  INSERT INTO archived_photo_shoots (
    original_id, festival_year, film_title, talent_names, photographer,
    shoot_date, shoot_time, location, duration_minutes, status, notes
  )
  SELECT 
    id, archive_year, film_program_display, subjects_display, photographer, shoot_date, 
    shoot_time, 'Venue: ' || COALESCE(house, 'Unknown'), 
    EXTRACT(EPOCH FROM (shoot_time - call_time))/60, 
    CASE WHEN selects_received THEN 'completed' ELSE 'pending' END,
    'Intro/Q&A: ' || COALESCE(intro_qa, 'None')
  FROM photo_shoots
  WHERE id NOT IN (
    SELECT original_id FROM archived_photo_shoots 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive In Attendance (use film_contacts since in_attendance doesn't exist)
  INSERT INTO archived_in_attendance (
    original_id, festival_year, name, film_association, role, contact_email, phone
  )
  SELECT 
    fc.id, archive_year, fc.name, 
    COALESCE(ff.title, sf.title, p.title, 'Unknown Film'),
    fc.contact_type, fc.email, fc.phone
  FROM film_contacts fc
  LEFT JOIN feature_films ff ON fc.film_id = ff.id
  LEFT JOIN short_films sf ON fc.film_id = sf.id
  LEFT JOIN programs p ON fc.film_id = p.id
  WHERE fc.id NOT IN (
    SELECT original_id FROM archived_in_attendance 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Red Carpets (map current table structure)
  INSERT INTO archived_red_carpets (
    original_id, festival_year, event_name, film_title, event_date, event_time,
    venue, talent_names, notes
  )
  SELECT 
    id, archive_year, 'Red Carpet Event', film_program_display, carpet_date, carpet_start_time,
    COALESCE(house, 'Main Venue'), subjects_display, 
    'Call: ' || COALESCE(call_time::text, 'TBD') || ', Film: ' || COALESCE(film_program_start_time::text, 'TBD')
  FROM red_carpets
  WHERE id NOT IN (
    SELECT original_id FROM archived_red_carpets 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Special Events (map current table structure)
  INSERT INTO archived_special_events (
    original_id, festival_year, event_name, event_type, event_date, start_time,
    end_time, venue, capacity, description, organizer, notes
  )
  SELECT 
    id, archive_year, title, event_type, event_date, start_time, end_time,
    venue_name, COALESCE(number_expected::integer, 0), location_details, lead_staff,
    'Food: ' || COALESCE(food, 'TBD') || ', Beverages: ' || COALESCE(beverages, 'TBD')
  FROM special_events
  WHERE id NOT IN (
    SELECT original_id FROM archived_special_events 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Published Screenings
  INSERT INTO archived_published_screenings (
    original_id, festival_year, film_title, screening_date, start_time,
    venue_short_code, run_time, capacity, tickets_sold, ticket_price, notes
  )
  SELECT 
    id, archive_year, film_title, screening_date, start_time, venue_short_code,
    run_time, capacity, tickets_sold, ticket_price, notes
  FROM published_screenings
  WHERE id NOT IN (
    SELECT original_id FROM archived_published_screenings 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS screening_count = ROW_COUNT;
  
  -- Archive P&I/Jury Screenings
  INSERT INTO archived_pi_jury_screenings (
    original_id, festival_year, film_title, screening_date, start_time,
    venue_short_code, run_time, capacity, screening_type, notes
  )
  SELECT 
    id, archive_year, film_title, screening_date, start_time, venue_short_code,
    run_time, capacity, 'pi_jury', notes
  FROM pi_jury_screenings
  WHERE id NOT IN (
    SELECT original_id FROM archived_pi_jury_screenings 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Tech Check Screenings
  INSERT INTO archived_tech_check_screenings (
    original_id, festival_year, film_title, screening_date, start_time,
    venue_short_code, run_time, capacity, tech_notes
  )
  SELECT 
    id, archive_year, film_title, screening_date, start_time, venue_short_code,
    run_time, capacity, notes
  FROM tech_check_screenings
  WHERE id NOT IN (
    SELECT original_id FROM archived_tech_check_screenings 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Film Contacts
  INSERT INTO archived_film_contacts (
    original_id, festival_year, film_id, film_title, name, company, 
    email, phone, contact_type
  )
  SELECT 
    fc.id, archive_year, fc.film_id, 
    COALESCE(ff.title, sf.title, p.title) as film_title,
    fc.name, fc.company, fc.email, fc.phone, fc.contact_type
  FROM film_contacts fc
  LEFT JOIN feature_films ff ON fc.film_id = ff.id
  LEFT JOIN short_films sf ON fc.film_id = sf.id
  LEFT JOIN programs p ON fc.film_id = p.id
  WHERE fc.id NOT IN (
    SELECT original_id FROM archived_film_contacts 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Archive Venues
  INSERT INTO archived_venues (
    original_id, festival_year, venue_name, short_code, address, 
    capacity, contact_person, contact_phone, technical_specs
  )
  SELECT 
    id, archive_year, venue_name, short_code, address, capacity,
    contact_person, contact_phone, technical_specs
  FROM venues
  WHERE id NOT IN (
    SELECT original_id FROM archived_venues 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  -- Prepare statistics
  archive_stats := jsonb_build_object(
    'success', true,
    'festival_year', archive_year,
    'festival_edition', festival_info.edition_number || 'th',
    'festival_name', festival_info.festival_name,
    'start_date', festival_info.start_date,
    'end_date', festival_info.end_date,
    'archived_counts', jsonb_build_object(
      'feature_films', feature_count,
      'short_films', short_count,
      'programs', program_count,
      'press', press_count,
      'screenings', screening_count,
      'press_requests', request_count
    ),
    'archived_at', NOW()
  );
  
  RETURN archive_stats;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get archive statistics
CREATE OR REPLACE FUNCTION get_archive_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_years', COUNT(*),
    'years', jsonb_agg(
      jsonb_build_object(
        'year', year,
        'edition', edition,
        'festival_name', festival_name,
        'start_date', start_date,
        'end_date', end_date,
        'archived_at', archived_at
      ) ORDER BY year DESC
    )
  )
  INTO stats
  FROM festival_years;
  
  RETURN COALESCE(stats, jsonb_build_object('total_years', 0, 'years', '[]'::jsonb));
END;
$$ LANGUAGE plpgsql;