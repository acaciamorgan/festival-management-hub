-- ============================================================================
-- FIX TICKETING MODULE: Relational Integrity + festival_year
-- ============================================================================
-- Adds missing columns to published_screenings, fixes CHECK constraints
-- to include 'shorts_program', recreates views with base-table fallback,
-- and backfills existing rows with film_id from title matching.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add missing columns to published_screenings
-- ============================================================================
ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS film_type VARCHAR(20);
ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER;

-- ============================================================================
-- 2. Fix film_type CHECK constraints to include 'shorts_program'
-- ============================================================================

-- ticketing_screenings: drop old constraint, add new
ALTER TABLE ticketing_screenings DROP CONSTRAINT IF EXISTS ticketing_screenings_film_type_check;
ALTER TABLE ticketing_screenings ADD CONSTRAINT ticketing_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

-- pi_jury_screenings: drop old constraint, add new
ALTER TABLE pi_jury_screenings DROP CONSTRAINT IF EXISTS pi_jury_screenings_film_type_check;
ALTER TABLE pi_jury_screenings ADD CONSTRAINT pi_jury_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

-- tech_check_screenings: drop old constraint, add new
ALTER TABLE tech_check_screenings DROP CONSTRAINT IF EXISTS tech_check_screenings_film_type_check;
ALTER TABLE tech_check_screenings ADD CONSTRAINT tech_check_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

-- published_screenings: add constraint (new column, no prior constraint)
ALTER TABLE published_screenings ADD CONSTRAINT published_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

-- ============================================================================
-- 3. Recreate views with base-table film_title fallback
-- ============================================================================
-- The views join on film_id, but when film_id is NULL (legacy data),
-- COALESCE falls through to NULL. Adding ts.film_title as final fallback
-- ensures the title always resolves. Same for run_time.

DROP VIEW IF EXISTS ticketing_screenings_with_films CASCADE;
CREATE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title, sp.program_name, ts.film_title) as film_title,
  COALESCE(ff.run_time, sf.run_time, ts.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short'
LEFT JOIN shorts_programs sp ON ts.film_id = sp.id AND ts.film_type = 'shorts_program';

COMMENT ON VIEW ticketing_screenings_with_films IS 'Ticketing screenings with film details. Falls back to base table film_title when film_id is NULL.';


DROP VIEW IF EXISTS pi_jury_screenings_with_films CASCADE;
CREATE VIEW pi_jury_screenings_with_films AS
SELECT
  pj.*,
  COALESCE(ff.title, sf.title, sp.program_name, pj.film_title) as film_title,
  COALESCE(ff.run_time, sf.run_time, pj.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM pi_jury_screenings pj
LEFT JOIN feature_films ff ON pj.film_id = ff.id AND pj.film_type = 'feature'
LEFT JOIN short_films sf ON pj.film_id = sf.id AND pj.film_type = 'short'
LEFT JOIN shorts_programs sp ON pj.film_id = sp.id AND pj.film_type = 'shorts_program';

COMMENT ON VIEW pi_jury_screenings_with_films IS 'P&I/Jury screenings with film details. Falls back to base table film_title when film_id is NULL.';


DROP VIEW IF EXISTS tech_check_screenings_with_films CASCADE;
CREATE VIEW tech_check_screenings_with_films AS
SELECT
  tc.*,
  COALESCE(ff.title, sf.title, sp.program_name, tc.film_title) as film_title,
  COALESCE(ff.run_time, sf.run_time, tc.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM tech_check_screenings tc
LEFT JOIN feature_films ff ON tc.film_id = ff.id AND tc.film_type = 'feature'
LEFT JOIN short_films sf ON tc.film_id = sf.id AND tc.film_type = 'short'
LEFT JOIN shorts_programs sp ON tc.film_id = sp.id AND tc.film_type = 'shorts_program';

COMMENT ON VIEW tech_check_screenings_with_films IS 'Tech check screenings with film details. Falls back to base table film_title when film_id is NULL.';


-- ============================================================================
-- 4. Backfill existing rows with film_id from title matching
-- ============================================================================

-- Backfill ticketing_screenings from feature_films
UPDATE ticketing_screenings ts
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE ts.film_id IS NULL
  AND ts.film_title = ff.title;

-- Backfill ticketing_screenings from shorts_programs
UPDATE ticketing_screenings ts
SET film_id = sp.id, film_type = 'shorts_program'
FROM shorts_programs sp
WHERE ts.film_id IS NULL
  AND ts.film_title = sp.program_name;

-- Backfill pi_jury_screenings from feature_films
UPDATE pi_jury_screenings pj
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE pj.film_id IS NULL
  AND pj.film_title = ff.title;

-- Backfill pi_jury_screenings from shorts_programs
UPDATE pi_jury_screenings pj
SET film_id = sp.id, film_type = 'shorts_program'
FROM shorts_programs sp
WHERE pj.film_id IS NULL
  AND pj.film_title = sp.program_name;

-- Backfill tech_check_screenings from feature_films
UPDATE tech_check_screenings tc
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE tc.film_id IS NULL
  AND tc.film_title = ff.title;

-- Backfill tech_check_screenings from shorts_programs
UPDATE tech_check_screenings tc
SET film_id = sp.id, film_type = 'shorts_program'
FROM shorts_programs sp
WHERE tc.film_id IS NULL
  AND tc.film_title = sp.program_name;

-- Backfill published_screenings from feature_films
UPDATE published_screenings ps
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE ps.film_id IS NULL
  AND ps.film_title = ff.title;

-- Backfill published_screenings from shorts_programs
UPDATE published_screenings ps
SET film_id = sp.id, film_type = 'shorts_program'
FROM shorts_programs sp
WHERE ps.film_id IS NULL
  AND ps.film_title = sp.program_name;

-- ============================================================================
-- 5. Add indexes for new columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_published_screenings_film_id ON published_screenings(film_id);
CREATE INDEX IF NOT EXISTS idx_published_screenings_festival_year ON published_screenings(festival_year);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TICKETING MODULE MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Added film_id, film_type, festival_year to published_screenings';
  RAISE NOTICE '- Fixed film_type CHECK constraints to allow shorts_program';
  RAISE NOTICE '- Recreated *_with_films views with base-table fallback';
  RAISE NOTICE '- Backfilled film_id/film_type from title matching';
  RAISE NOTICE '============================================================================';
END $$;
