-- ============================================================================
-- ROLLBACK SCRIPT FOR DATA DUPLICATION FIX
-- ============================================================================
-- This script reverses the changes made by fix-data-duplication-migration.sql
-- Use this ONLY if the migration causes issues and you need to revert
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: RESTORE PRESS_SCREENINGS DUPLICATED COLUMNS
-- ============================================================================
ALTER TABLE press_screenings ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE press_screenings ADD COLUMN IF NOT EXISTS runtime INTEGER;

-- Repopulate from film tables
UPDATE press_screenings ps
SET
  title = ff.title,
  runtime = ff.run_time
FROM feature_films ff
WHERE ps.film_id = ff.id AND ps.film_type = 'feature';

UPDATE press_screenings ps
SET
  title = sf.title,
  runtime = sf.run_time
FROM short_films sf
WHERE ps.film_id = sf.id AND ps.film_type = 'short';


-- ============================================================================
-- STEP 2: RESTORE PI_JURY_SCREENINGS DUPLICATED COLUMNS
-- ============================================================================
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS film_title TEXT;
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS run_time INTEGER;

-- Repopulate from film tables
UPDATE pi_jury_screenings pj
SET
  film_title = ff.title,
  run_time = ff.run_time
FROM feature_films ff
WHERE pj.film_id = ff.id AND pj.film_type = 'feature';

UPDATE pi_jury_screenings pj
SET
  film_title = sf.title,
  run_time = sf.run_time
FROM short_films sf
WHERE pj.film_id = sf.id AND pj.film_type = 'short';

-- Remove new columns
ALTER TABLE pi_jury_screenings DROP COLUMN IF EXISTS film_id;
ALTER TABLE pi_jury_screenings DROP COLUMN IF EXISTS film_type;


-- ============================================================================
-- STEP 3: RESTORE TECH_CHECK_SCREENINGS DUPLICATED COLUMNS
-- ============================================================================
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS film_title TEXT;
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS run_time INTEGER;

-- Repopulate from film tables
UPDATE tech_check_screenings tc
SET
  film_title = ff.title,
  run_time = ff.run_time
FROM feature_films ff
WHERE tc.film_id = ff.id AND tc.film_type = 'feature';

UPDATE tech_check_screenings tc
SET
  film_title = sf.title,
  run_time = sf.run_time
FROM short_films sf
WHERE tc.film_id = sf.id AND tc.film_type = 'short';

-- Remove new columns
ALTER TABLE tech_check_screenings DROP COLUMN IF EXISTS film_id;
ALTER TABLE tech_check_screenings DROP COLUMN IF EXISTS film_type;


-- ============================================================================
-- STEP 4: RESTORE TICKETING_SCREENINGS DUPLICATED COLUMNS
-- ============================================================================
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS film_title TEXT;
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS run_time INTEGER;

-- Repopulate from film tables
UPDATE ticketing_screenings ts
SET
  film_title = ff.title,
  run_time = ff.run_time
FROM feature_films ff
WHERE ts.film_id = ff.id AND ts.film_type = 'feature';

UPDATE ticketing_screenings ts
SET
  film_title = sf.title,
  run_time = sf.run_time
FROM short_films sf
WHERE ts.film_id = sf.id AND ts.film_type = 'short';

-- Remove new columns
ALTER TABLE ticketing_screenings DROP COLUMN IF EXISTS film_id;
ALTER TABLE ticketing_screenings DROP COLUMN IF EXISTS film_type;


-- ============================================================================
-- STEP 5: RESTORE INTERVIEWS FILM_TITLE COLUMN
-- ============================================================================
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS film_title TEXT;

-- Repopulate from film tables
UPDATE interviews i
SET film_title = ff.title
FROM feature_films ff
WHERE i.film_id = ff.id;

UPDATE interviews i
SET film_title = sf.title
FROM short_films sf
WHERE i.short_film_id = sf.id;

UPDATE interviews i
SET film_title = sp.program_name
FROM shorts_programs sp
WHERE i.shorts_program_id = sp.id;

UPDATE interviews i
SET film_title = p.title
FROM programs p
WHERE i.program_id = p.id;


-- ============================================================================
-- STEP 6: RESTORE GUEST_FILMS FILM_TITLE COLUMN
-- ============================================================================
ALTER TABLE guest_films ADD COLUMN IF NOT EXISTS film_title TEXT;

-- Repopulate from film tables
UPDATE guest_films gf
SET film_title = ff.title
FROM feature_films ff
WHERE gf.film_id = ff.id;


-- ============================================================================
-- STEP 7: RESTORE PRESS_REQUESTS FILM_TITLES COLUMN
-- ============================================================================
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS film_titles TEXT;

-- Repopulate from junction table
UPDATE press_requests pr
SET film_titles = (
  SELECT string_agg(COALESCE(ff.title, sf.title), ', ' ORDER BY prf.created_at)
  FROM press_request_films prf
  LEFT JOIN feature_films ff ON prf.film_id = ff.id AND prf.film_type = 'feature'
  LEFT JOIN short_films sf ON prf.film_id = sf.id AND prf.film_type = 'short'
  WHERE prf.press_request_id = pr.id
);

-- Drop the junction table
DROP TABLE IF EXISTS press_request_films;


-- ============================================================================
-- STEP 8: DROP HELPER VIEWS
-- ============================================================================
DROP VIEW IF EXISTS press_screenings_with_films;
DROP VIEW IF EXISTS pi_jury_screenings_with_films;
DROP VIEW IF EXISTS tech_check_screenings_with_films;
DROP VIEW IF EXISTS ticketing_screenings_with_films;
DROP VIEW IF EXISTS interviews_with_films;
DROP VIEW IF EXISTS guest_films_with_details;
DROP VIEW IF EXISTS press_requests_with_films;


COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ROLLBACK COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All tables have been restored to their previous state with duplicated data.';
  RAISE NOTICE 'The system is back to the way it was before the migration.';
  RAISE NOTICE '============================================================================';
END $$;
