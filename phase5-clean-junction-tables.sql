-- ============================================================================
-- PHASE 5: CLEAN JUNCTION TABLES (Remove Redundant Columns)
-- ============================================================================
-- This script removes any redundant name/title columns from junction tables
-- These columns duplicate data that should be fetched via foreign keys
-- SAFE: Only removes duplicated data, not source of truth
-- ============================================================================

BEGIN;

-- ============================================================================
-- Check what columns exist in junction tables
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 5: Cleaning Junction Tables';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Checking for redundant columns to remove...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHOTO SHOOT FILMS - Remove film_title if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoot_films' AND column_name = 'film_title'
  ) THEN
    ALTER TABLE photo_shoot_films DROP COLUMN film_title;
    RAISE NOTICE '✓ Removed film_title column from photo_shoot_films';
  ELSE
    RAISE NOTICE '  photo_shoot_films.film_title - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- PHOTO SHOOT SUBJECTS - Remove guest_name if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoot_subjects' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE photo_shoot_subjects DROP COLUMN guest_name;
    RAISE NOTICE '✓ Removed guest_name column from photo_shoot_subjects';
  ELSE
    RAISE NOTICE '  photo_shoot_subjects.guest_name - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- RED CARPET FILMS - Remove film_title if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'red_carpet_films' AND column_name = 'film_title'
  ) THEN
    ALTER TABLE red_carpet_films DROP COLUMN film_title;
    RAISE NOTICE '✓ Removed film_title column from red_carpet_films';
  ELSE
    RAISE NOTICE '  red_carpet_films.film_title - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- RED CARPET SUBJECTS - Remove guest_name if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'red_carpet_subjects' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE red_carpet_subjects DROP COLUMN guest_name;
    RAISE NOTICE '✓ Removed guest_name column from red_carpet_subjects';
  ELSE
    RAISE NOTICE '  red_carpet_subjects.guest_name - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- SPECIAL EVENT FILMS - Remove film_title if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_event_films' AND column_name = 'film_title'
  ) THEN
    ALTER TABLE special_event_films DROP COLUMN film_title;
    RAISE NOTICE '✓ Removed film_title column from special_event_films';
  ELSE
    RAISE NOTICE '  special_event_films.film_title - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- SPECIAL EVENT GUESTS - Remove guest_name if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_event_guests' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE special_event_guests DROP COLUMN guest_name;
    RAISE NOTICE '✓ Removed guest_name column from special_event_guests';
  ELSE
    RAISE NOTICE '  special_event_guests.guest_name - does not exist (good)';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 5 COMPLETE: Junction tables cleaned';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All junction tables now have clean relational structure:';
  RAISE NOTICE '  - Only ID columns (no duplicated names/titles)';
  RAISE NOTICE '  - Names/titles fetched via JOINs';
  RAISE NOTICE '  - Updates to films/guests automatically propagate';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to proceed to Phase 6 (create views).';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
