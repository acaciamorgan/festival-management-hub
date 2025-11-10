-- ============================================================================
-- PHASE 4: SMART MIGRATION WITH AUTOMATIC MATCHING
-- ============================================================================
-- This script migrates data from old display columns to new relational structure
-- Items that match database → become FK links in junction tables
-- Items that DON'T match → saved as free text descriptions
-- ============================================================================
-- IMPORTANT: Old columns remain intact until you approve the results!
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHOTO SHOOTS - Migrate Films/Programs
-- ============================================================================
DO $$
DECLARE
  shoot RECORD;
  title_text TEXT;
  matched_id UUID;
  matched_type VARCHAR(20);
  unmatched_titles TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHOTO SHOOTS - Migrating Films/Programs';
  RAISE NOTICE '============================================================================';

  FOR shoot IN
    SELECT id, film_program_display
    FROM photo_shoots
    WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_titles := ARRAY[]::TEXT[];

    -- Process each comma-separated title
    FOR title_text IN
      SELECT TRIM(unnest(string_to_array(shoot.film_program_display, ',')))
    LOOP
      CONTINUE WHEN title_text = '';
      matched_id := NULL;

      -- Try feature films
      SELECT id INTO matched_id FROM feature_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'feature')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try short films
      SELECT id INTO matched_id FROM short_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'short')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try shorts programs
      SELECT id INTO matched_id FROM shorts_programs WHERE program_name = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'shorts_program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try programs
      SELECT id INTO matched_id FROM programs WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- No match found
      unmatched_titles := array_append(unmatched_titles, title_text);
      total_unmatched := total_unmatched + 1;
    END LOOP;

    -- Save unmatched titles as free text
    IF array_length(unmatched_titles, 1) > 0 THEN
      UPDATE photo_shoots
      SET film_program_description = array_to_string(unmatched_titles, ', ')
      WHERE id = shoot.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % photo shoots', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- PHOTO SHOOTS - Migrate Subjects/Guests
-- ============================================================================
DO $$
DECLARE
  shoot RECORD;
  subject_name TEXT;
  matched_guest_id UUID;
  unmatched_subjects TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'PHOTO SHOOTS - Migrating Subjects/Guests';
  RAISE NOTICE '---';

  FOR shoot IN
    SELECT id, subjects_display
    FROM photo_shoots
    WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_subjects := ARRAY[]::TEXT[];

    FOR subject_name IN
      SELECT TRIM(unnest(string_to_array(shoot.subjects_display, ',')))
    LOOP
      CONTINUE WHEN subject_name = '';

      -- Try to match to guests table
      SELECT id INTO matched_guest_id FROM guests WHERE name = subject_name LIMIT 1;

      IF matched_guest_id IS NOT NULL THEN
        INSERT INTO photo_shoot_subjects (photo_shoot_id, guest_id)
        VALUES (shoot.id, matched_guest_id)
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
      ELSE
        unmatched_subjects := array_append(unmatched_subjects, subject_name);
        total_unmatched := total_unmatched + 1;
      END IF;
    END LOOP;

    -- Save unmatched subjects as free text
    IF array_length(unmatched_subjects, 1) > 0 THEN
      UPDATE photo_shoots
      SET subjects_description = array_to_string(unmatched_subjects, ', ')
      WHERE id = shoot.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % photo shoots', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- RED CARPETS - Migrate Films/Programs
-- ============================================================================
DO $$
DECLARE
  carpet RECORD;
  title_text TEXT;
  matched_id UUID;
  matched_type VARCHAR(20);
  unmatched_titles TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RED CARPETS - Migrating Films/Programs';
  RAISE NOTICE '============================================================================';

  FOR carpet IN
    SELECT id, film_program_display
    FROM red_carpets
    WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_titles := ARRAY[]::TEXT[];

    FOR title_text IN
      SELECT TRIM(unnest(string_to_array(carpet.film_program_display, ',')))
    LOOP
      CONTINUE WHEN title_text = '';
      matched_id := NULL;

      -- Try feature films
      SELECT id INTO matched_id FROM feature_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO red_carpet_films (red_carpet_id, film_id, film_type)
        VALUES (carpet.id, matched_id, 'feature')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try short films
      SELECT id INTO matched_id FROM short_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO red_carpet_films (red_carpet_id, film_id, film_type)
        VALUES (carpet.id, matched_id, 'short')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try shorts programs
      SELECT id INTO matched_id FROM shorts_programs WHERE program_name = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO red_carpet_films (red_carpet_id, film_id, film_type)
        VALUES (carpet.id, matched_id, 'shorts_program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try programs
      SELECT id INTO matched_id FROM programs WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO red_carpet_films (red_carpet_id, film_id, film_type)
        VALUES (carpet.id, matched_id, 'program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- No match found
      unmatched_titles := array_append(unmatched_titles, title_text);
      total_unmatched := total_unmatched + 1;
    END LOOP;

    -- Save unmatched as free text
    IF array_length(unmatched_titles, 1) > 0 THEN
      UPDATE red_carpets
      SET film_program_description = array_to_string(unmatched_titles, ', ')
      WHERE id = carpet.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % red carpets', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- RED CARPETS - Migrate Subjects/Guests
-- ============================================================================
DO $$
DECLARE
  carpet RECORD;
  subject_name TEXT;
  matched_guest_id UUID;
  unmatched_subjects TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'RED CARPETS - Migrating Subjects/Guests';
  RAISE NOTICE '---';

  FOR carpet IN
    SELECT id, subjects_display
    FROM red_carpets
    WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_subjects := ARRAY[]::TEXT[];

    FOR subject_name IN
      SELECT TRIM(unnest(string_to_array(carpet.subjects_display, ',')))
    LOOP
      CONTINUE WHEN subject_name = '';

      SELECT id INTO matched_guest_id FROM guests WHERE name = subject_name LIMIT 1;

      IF matched_guest_id IS NOT NULL THEN
        INSERT INTO red_carpet_subjects (red_carpet_id, guest_id)
        VALUES (carpet.id, matched_guest_id)
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
      ELSE
        unmatched_subjects := array_append(unmatched_subjects, subject_name);
        total_unmatched := total_unmatched + 1;
      END IF;
    END LOOP;

    -- Save unmatched as free text
    IF array_length(unmatched_subjects, 1) > 0 THEN
      UPDATE red_carpets
      SET subjects_description = array_to_string(unmatched_subjects, ', ')
      WHERE id = carpet.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % red carpets', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- SPECIAL EVENTS - Migrate Films/Programs
-- ============================================================================
DO $$
DECLARE
  event RECORD;
  title_text TEXT;
  matched_id UUID;
  matched_type VARCHAR(20);
  unmatched_titles TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SPECIAL EVENTS - Migrating Films/Programs';
  RAISE NOTICE '============================================================================';

  FOR event IN
    SELECT id, films_programs_display
    FROM special_events
    WHERE films_programs_display IS NOT NULL
    AND films_programs_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_titles := ARRAY[]::TEXT[];

    FOR title_text IN
      SELECT TRIM(unnest(string_to_array(event.films_programs_display, ',')))
    LOOP
      CONTINUE WHEN title_text = '';
      matched_id := NULL;

      -- Try feature films
      SELECT id INTO matched_id FROM feature_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO special_event_films (special_event_id, film_id, film_type)
        VALUES (event.id, matched_id, 'feature')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try short films
      SELECT id INTO matched_id FROM short_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO special_event_films (special_event_id, film_id, film_type)
        VALUES (event.id, matched_id, 'short')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try shorts programs
      SELECT id INTO matched_id FROM shorts_programs WHERE program_name = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO special_event_films (special_event_id, film_id, film_type)
        VALUES (event.id, matched_id, 'shorts_program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- Try programs
      SELECT id INTO matched_id FROM programs WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO special_event_films (special_event_id, film_id, film_type)
        VALUES (event.id, matched_id, 'program')
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
        CONTINUE;
      END IF;

      -- No match found
      unmatched_titles := array_append(unmatched_titles, title_text);
      total_unmatched := total_unmatched + 1;
    END LOOP;

    -- Save unmatched as free text
    IF array_length(unmatched_titles, 1) > 0 THEN
      UPDATE special_events
      SET film_program_description = array_to_string(unmatched_titles, ', ')
      WHERE id = event.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % special events', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- SPECIAL EVENTS - Migrate Guests
-- ============================================================================
DO $$
DECLARE
  event RECORD;
  guest_name TEXT;
  matched_guest_id UUID;
  unmatched_guests TEXT[];
  total_processed INTEGER := 0;
  total_matched INTEGER := 0;
  total_unmatched INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'SPECIAL EVENTS - Migrating Guests';
  RAISE NOTICE '---';

  FOR event IN
    SELECT id, guests_display
    FROM special_events
    WHERE guests_display IS NOT NULL
    AND guests_display != ''
  LOOP
    total_processed := total_processed + 1;
    unmatched_guests := ARRAY[]::TEXT[];

    FOR guest_name IN
      SELECT TRIM(unnest(string_to_array(event.guests_display, ',')))
    LOOP
      CONTINUE WHEN guest_name = '';

      SELECT id INTO matched_guest_id FROM guests WHERE name = guest_name LIMIT 1;

      IF matched_guest_id IS NOT NULL THEN
        INSERT INTO special_event_guests (special_event_id, guest_id)
        VALUES (event.id, matched_guest_id)
        ON CONFLICT DO NOTHING;
        total_matched := total_matched + 1;
      ELSE
        unmatched_guests := array_append(unmatched_guests, guest_name);
        total_unmatched := total_unmatched + 1;
      END IF;
    END LOOP;

    -- Save unmatched as free text
    IF array_length(unmatched_guests, 1) > 0 THEN
      UPDATE special_events
      SET guests_description = array_to_string(unmatched_guests, ', ')
      WHERE id = event.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % special events', total_processed;
  RAISE NOTICE '  - Matched to database: %', total_matched;
  RAISE NOTICE '  - Saved as free text: %', total_unmatched;
END $$;


-- ============================================================================
-- MIGRATION COMPLETE - SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 4 COMPLETE: Smart migration finished';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Old display columns remain intact for verification!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run verify-phase4.sql to see side-by-side comparison';
  RAISE NOTICE '2. Review the results and approve before proceeding';
  RAISE NOTICE '3. Only after approval, proceed to Phase 5';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
