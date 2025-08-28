-- Update archive function to include festival_settings
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
  settings_count integer := 0;
BEGIN
  -- Get current festival information
  SELECT edition_number, festival_name, start_date, end_date, important_links, created_at, updated_at
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
    festival_info.important_links := '[]'::jsonb;
    festival_info.created_at := NOW();
    festival_info.updated_at := NOW();
  END IF;
  
  -- Calculate archive year from start_date
  archive_year := EXTRACT(YEAR FROM festival_info.start_date);
  
  -- Archive Festival Settings FIRST
  INSERT INTO archive_festival_settings (
    edition_number, festival_name, start_date, end_date, 
    important_links, created_at, updated_at, archived_year
  )
  VALUES (
    festival_info.edition_number,
    festival_info.festival_name,
    festival_info.start_date,
    festival_info.end_date,
    festival_info.important_links,
    festival_info.created_at,
    festival_info.updated_at,
    archive_year
  )
  ON CONFLICT (archived_year) DO UPDATE SET
    edition_number = EXCLUDED.edition_number,
    festival_name = EXCLUDED.festival_name,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    important_links = EXCLUDED.important_links,
    updated_at = NOW();
  
  GET DIAGNOSTICS settings_count = ROW_COUNT;
  
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
  
  -- Archive Press/Journalists
  INSERT INTO archived_press_journalists (
    original_id, festival_year, outlet, outlet_type, journalist_name, journalist_email, 
    phone, accreditation_status, photo_application, approved, attendance_type
  )
  SELECT 
    id, archive_year, outlet, outlet_type, journalist_name, journalist_email,
    phone, accreditation_status, photo_application, approved, attendance_type
  FROM press_journalists
  WHERE id NOT IN (
    SELECT original_id FROM archived_press_journalists 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS press_count = ROW_COUNT;
  
  -- Archive Press Screenings
  INSERT INTO archived_press_screenings (
    original_id, festival_year, screening_date, screening_time, film_title,
    venue, capacity, rsvp_count
  )
  SELECT 
    id, archive_year, screening_date, screening_time, film_title,
    venue, capacity, rsvp_count
  FROM press_screenings
  WHERE id NOT IN (
    SELECT original_id FROM archived_press_screenings
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS screening_count = ROW_COUNT;
  
  -- Archive Press Requests
  INSERT INTO archived_press_requests (
    original_id, festival_year, journalist_name, journalist_email, outlet,
    request_type, film_title, request_date, status
  )
  SELECT 
    id, archive_year, journalist_name, journalist_email, outlet,
    request_type, film_title, request_date, status
  FROM press_requests
  WHERE id NOT IN (
    SELECT original_id FROM archived_press_requests 
    WHERE festival_year = archive_year AND original_id IS NOT NULL
  );
  
  GET DIAGNOSTICS request_count = ROW_COUNT;
  
  -- Return statistics
  archive_stats := jsonb_build_object(
    'archive_year', archive_year,
    'festival_edition', festival_info.edition_number,
    'festival_name', festival_info.festival_name,
    'start_date', festival_info.start_date,
    'end_date', festival_info.end_date,
    'archived_counts', jsonb_build_object(
      'festival_settings', settings_count,
      'feature_films', feature_count,
      'short_films', short_count,
      'programs', program_count,
      'press_journalists', press_count,
      'press_screenings', screening_count,
      'press_requests', request_count
    ),
    'archived_at', NOW()
  );
  
  RETURN archive_stats;
END;
$$ LANGUAGE plpgsql;

-- Constraint already exists, no need to add it