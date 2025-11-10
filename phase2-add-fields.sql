-- ============================================================================
-- PHASE 2: ADD NEW FREE-TEXT DESCRIPTION FIELDS
-- ============================================================================
-- This script adds new fields for free-text fallbacks
-- SAFE: Only adding columns, not modifying or dropping any existing data
-- ============================================================================

BEGIN;

-- Photo Shoots: Add free-text description fields
-- ============================================================================
ALTER TABLE photo_shoots
  ADD COLUMN IF NOT EXISTS film_program_description TEXT,
  ADD COLUMN IF NOT EXISTS subjects_description TEXT;

COMMENT ON COLUMN photo_shoots.film_program_description
  IS 'Free-text description for films/programs not in database';
COMMENT ON COLUMN photo_shoots.subjects_description
  IS 'Free-text description for subjects/guests not in database';


-- Red Carpets: Add free-text description fields
-- ============================================================================
ALTER TABLE red_carpets
  ADD COLUMN IF NOT EXISTS film_program_description TEXT,
  ADD COLUMN IF NOT EXISTS subjects_description TEXT;

COMMENT ON COLUMN red_carpets.film_program_description
  IS 'Free-text description for films/programs not in database';
COMMENT ON COLUMN red_carpets.subjects_description
  IS 'Free-text description for subjects/guests not in database';


-- Special Events: Add free-text description fields
-- ============================================================================
ALTER TABLE special_events
  ADD COLUMN IF NOT EXISTS film_program_description TEXT,
  ADD COLUMN IF NOT EXISTS guests_description TEXT;

COMMENT ON COLUMN special_events.film_program_description
  IS 'Free-text description for films/programs not in database (e.g., "Board Night", "Donor Reception")';
COMMENT ON COLUMN special_events.guests_description
  IS 'Free-text description for guests not in database (e.g., "Board members", "Festival volunteers")';


-- Verification: Check that columns were added
-- ============================================================================
DO $$
BEGIN
  -- Check photo_shoots
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoots'
    AND column_name IN ('film_program_description', 'subjects_description')
  ) THEN
    RAISE NOTICE '✓ Photo Shoots: New columns added successfully';
  ELSE
    RAISE EXCEPTION 'Photo Shoots: Failed to add columns';
  END IF;

  -- Check red_carpets
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'red_carpets'
    AND column_name IN ('film_program_description', 'subjects_description')
  ) THEN
    RAISE NOTICE '✓ Red Carpets: New columns added successfully';
  ELSE
    RAISE EXCEPTION 'Red Carpets: Failed to add columns';
  END IF;

  -- Check special_events
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_events'
    AND column_name IN ('film_program_description', 'guests_description')
  ) THEN
    RAISE NOTICE '✓ Special Events: New columns added successfully';
  ELSE
    RAISE EXCEPTION 'Special Events: Failed to add columns';
  END IF;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 2 COMPLETE: New free-text description fields added';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All existing data remains intact.';
  RAISE NOTICE 'Old display columns (film_program_display, subjects_display, etc.) unchanged.';
  RAISE NOTICE 'Ready to proceed to Phase 3 (create junction tables).';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
