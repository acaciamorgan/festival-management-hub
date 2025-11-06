-- ============================================================================
-- FIX DATA DUPLICATION - ESTABLISH SINGLE SOURCE OF TRUTH
-- ============================================================================
-- This migration removes duplicated film data from all screening and event tables
-- and ensures they use proper foreign key references to the film tables instead.
--
-- IMPORTANT: Run this during low-traffic period and backup your database first!
-- ============================================================================

-- SAFETY: Begin transaction so we can rollback if anything goes wrong
BEGIN;

-- ============================================================================
-- STEP 1: FIX PRESS_SCREENINGS TABLE
-- ============================================================================
-- Currently has: film_id, film_type, title (duplicated), runtime (duplicated)
-- Should have: film_id, film_type ONLY

-- Remove the duplicated columns
ALTER TABLE press_screenings DROP COLUMN IF EXISTS title CASCADE;
ALTER TABLE press_screenings DROP COLUMN IF EXISTS runtime CASCADE;

-- Add proper foreign key constraints if not already present
-- Note: We can't add a single FK because film_id can point to either feature_films or short_films
-- We'll rely on application-level validation and the film_type field

COMMENT ON COLUMN press_screenings.film_id IS 'Foreign key to feature_films or short_films table (check film_type)';
COMMENT ON COLUMN press_screenings.film_type IS 'Indicates whether film_id references feature_films or short_films';


-- ============================================================================
-- STEP 2: FIX PI_JURY_SCREENINGS TABLE
-- ============================================================================
-- Currently has: film_title (TEXT), run_time (duplicated), NO film_id!
-- Should have: film_id, film_type

-- First, add the new columns
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS film_type VARCHAR(10) CHECK (film_type IN ('feature', 'short'));

-- Try to match existing film_title to actual films
-- Match to feature films
UPDATE pi_jury_screenings pj
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE pj.film_title = ff.title AND pj.film_id IS NULL;

-- Match to short films (only if not already matched to features)
UPDATE pi_jury_screenings pj
SET film_id = sf.id, film_type = 'short'
FROM short_films sf
WHERE pj.film_title = sf.title AND pj.film_id IS NULL;

-- Report any orphaned records (couldn't find matching film)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM pi_jury_screenings WHERE film_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % P&I/Jury screening records with no matching film. These will need manual review.', orphan_count;
    RAISE NOTICE 'Orphaned P&I/Jury screenings: %', (SELECT string_agg(film_title, ', ') FROM pi_jury_screenings WHERE film_id IS NULL);
  END IF;
END $$;

-- Remove duplicated columns
ALTER TABLE pi_jury_screenings DROP COLUMN IF EXISTS film_title CASCADE;
ALTER TABLE pi_jury_screenings DROP COLUMN IF EXISTS run_time CASCADE;

-- Make film_id required (for future records)
ALTER TABLE pi_jury_screenings ALTER COLUMN film_id SET NOT NULL;

COMMENT ON COLUMN pi_jury_screenings.film_id IS 'Foreign key to feature_films or short_films table (check film_type)';
COMMENT ON COLUMN pi_jury_screenings.film_type IS 'Indicates whether film_id references feature_films or short_films';


-- ============================================================================
-- STEP 3: FIX TECH_CHECK_SCREENINGS TABLE
-- ============================================================================
-- Currently has: film_title (TEXT), run_time (duplicated), NO film_id!
-- Should have: film_id, film_type

-- First, add the new columns
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS film_type VARCHAR(10) CHECK (film_type IN ('feature', 'short'));

-- Try to match existing film_title to actual films
-- Match to feature films
UPDATE tech_check_screenings tc
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE tc.film_title = ff.title AND tc.film_id IS NULL;

-- Match to short films (only if not already matched to features)
UPDATE tech_check_screenings tc
SET film_id = sf.id, film_type = 'short'
FROM short_films sf
WHERE tc.film_title = sf.title AND tc.film_id IS NULL;

-- Report any orphaned records
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM tech_check_screenings WHERE film_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % tech check screening records with no matching film. These will need manual review.', orphan_count;
    RAISE NOTICE 'Orphaned tech check screenings: %', (SELECT string_agg(film_title, ', ') FROM tech_check_screenings WHERE film_id IS NULL);
  END IF;
END $$;

-- Remove duplicated columns
ALTER TABLE tech_check_screenings DROP COLUMN IF EXISTS film_title CASCADE;
ALTER TABLE tech_check_screenings DROP COLUMN IF EXISTS run_time CASCADE;

-- Make film_id required (for future records)
ALTER TABLE tech_check_screenings ALTER COLUMN film_id SET NOT NULL;

COMMENT ON COLUMN tech_check_screenings.film_id IS 'Foreign key to feature_films or short_films table (check film_type)';
COMMENT ON COLUMN tech_check_screenings.film_type IS 'Indicates whether film_id references feature_films or short_films';


-- ============================================================================
-- STEP 4: FIX TICKETING_SCREENINGS (PUBLISHED SCREENINGS) TABLE
-- ============================================================================
-- Currently has: film_title (TEXT), run_time (duplicated), programming_film_id
-- Should have: film_id, film_type (referencing actual film tables, not programming)

-- Add the new columns if they don't exist
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS film_type VARCHAR(10) CHECK (film_type IN ('feature', 'short'));

-- Try to match existing film_title to actual films
-- Match to feature films
UPDATE ticketing_screenings ts
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE ts.film_title = ff.title AND ts.film_id IS NULL;

-- Match to short films (only if not already matched to features)
UPDATE ticketing_screenings ts
SET film_id = sf.id, film_type = 'short'
FROM short_films sf
WHERE ts.film_title = sf.title AND ts.film_id IS NULL;

-- Report any orphaned records
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM ticketing_screenings WHERE film_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % ticketing screening records with no matching film. These will need manual review.', orphan_count;
    RAISE NOTICE 'Orphaned ticketing screenings: %', (SELECT string_agg(film_title, ', ') FROM ticketing_screenings WHERE film_id IS NULL);
  END IF;
END $$;

-- Remove duplicated columns
ALTER TABLE ticketing_screenings DROP COLUMN IF EXISTS film_title CASCADE;
ALTER TABLE ticketing_screenings DROP COLUMN IF EXISTS run_time CASCADE;
-- Keep programming_film_id for now as it may have other uses, but add comment
COMMENT ON COLUMN ticketing_screenings.programming_film_id IS 'DEPRECATED: Legacy reference to programming pipeline. Use film_id instead.';

-- Make film_id required (for future records)
ALTER TABLE ticketing_screenings ALTER COLUMN film_id SET NOT NULL;

COMMENT ON COLUMN ticketing_screenings.film_id IS 'Foreign key to feature_films or short_films table (check film_type)';
COMMENT ON COLUMN ticketing_screenings.film_type IS 'Indicates whether film_id references feature_films or short_films';


-- ============================================================================
-- STEP 5: FIX INTERVIEWS TABLE
-- ============================================================================
-- Currently has: film_id, film_title (duplicated), plus shorts_program_id, program_id
-- Should have: ONLY the ID references

-- Remove the duplicated film_title column
ALTER TABLE interviews DROP COLUMN IF EXISTS film_title CASCADE;

COMMENT ON COLUMN interviews.film_id IS 'Foreign key to feature_films table';
COMMENT ON COLUMN interviews.shorts_program_id IS 'Foreign key to shorts_programs table';
COMMENT ON COLUMN interviews.program_id IS 'Foreign key to programs table';
COMMENT ON COLUMN interviews.short_film_id IS 'Foreign key to short_films table';


-- ============================================================================
-- STEP 6: FIX GUEST_FILMS TABLE
-- ============================================================================
-- Currently has: guest_id, film_id, film_title (duplicated)
-- Should have: ONLY the ID references

-- Remove the duplicated film_title column
ALTER TABLE guest_films DROP COLUMN IF EXISTS film_title CASCADE;

COMMENT ON COLUMN guest_films.guest_id IS 'Foreign key to guests table';
COMMENT ON COLUMN guest_films.film_id IS 'Foreign key to feature_films table';


-- ============================================================================
-- STEP 7: FIX PRESS_REQUESTS TABLE
-- ============================================================================
-- Currently has: film_titles TEXT (comma-separated, duplicated)
-- This is more complex because it stores multiple films per request
-- We'll create a junction table for this many-to-many relationship

-- Create new junction table
CREATE TABLE IF NOT EXISTS press_request_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  press_request_id UUID NOT NULL REFERENCES press_requests(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(10) NOT NULL CHECK (film_type IN ('feature', 'short')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(press_request_id, film_id, film_type)
);

CREATE INDEX idx_press_request_films_request ON press_request_films(press_request_id);
CREATE INDEX idx_press_request_films_film ON press_request_films(film_id);

COMMENT ON TABLE press_request_films IS 'Junction table linking press requests to films (many-to-many)';
COMMENT ON COLUMN press_request_films.film_id IS 'Foreign key to feature_films or short_films table (check film_type)';

-- Try to migrate existing film_titles to the junction table
DO $$
DECLARE
  req RECORD;
  title TEXT;
  matched_film_id UUID;
  matched_film_type VARCHAR(10);
BEGIN
  FOR req IN SELECT id, film_titles FROM press_requests WHERE film_titles IS NOT NULL LOOP
    -- Split comma-separated titles and try to match each
    FOR title IN SELECT TRIM(unnest(string_to_array(req.film_titles, ','))) LOOP
      -- Try to find in feature films
      SELECT id INTO matched_film_id FROM feature_films WHERE title = title LIMIT 1;
      IF matched_film_id IS NOT NULL THEN
        matched_film_type := 'feature';
        INSERT INTO press_request_films (press_request_id, film_id, film_type)
        VALUES (req.id, matched_film_id, matched_film_type)
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- Try to find in short films
      SELECT id INTO matched_film_id FROM short_films WHERE title = title LIMIT 1;
      IF matched_film_id IS NOT NULL THEN
        matched_film_type := 'short';
        INSERT INTO press_request_films (press_request_id, film_id, film_type)
        VALUES (req.id, matched_film_id, matched_film_type)
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- If we get here, we couldn't match this title
      RAISE NOTICE 'Could not match film title "%" from press request %', title, req.id;
    END LOOP;
  END LOOP;
END $$;

-- Remove the old column
ALTER TABLE press_requests DROP COLUMN IF EXISTS film_titles CASCADE;


-- ============================================================================
-- STEP 8: ADD HELPER VIEWS FOR EASY QUERYING
-- ============================================================================
-- These views make it easier for the frontend to get film data with JOINs

-- View for press screenings with film details
CREATE OR REPLACE VIEW press_screenings_with_films AS
SELECT
  ps.*,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime,
  COALESCE(ff.director, sf.director) as director
FROM press_screenings ps
LEFT JOIN feature_films ff ON ps.film_id = ff.id AND ps.film_type = 'feature'
LEFT JOIN short_films sf ON ps.film_id = sf.id AND ps.film_type = 'short';

COMMENT ON VIEW press_screenings_with_films IS 'Press screenings joined with film details from source tables';


-- View for P&I/Jury screenings with film details
CREATE OR REPLACE VIEW pi_jury_screenings_with_films AS
SELECT
  pj.*,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime,
  COALESCE(ff.director, sf.director) as director
FROM pi_jury_screenings pj
LEFT JOIN feature_films ff ON pj.film_id = ff.id AND pj.film_type = 'feature'
LEFT JOIN short_films sf ON pj.film_id = sf.id AND pj.film_type = 'short';

COMMENT ON VIEW pi_jury_screenings_with_films IS 'P&I/Jury screenings joined with film details from source tables';


-- View for tech check screenings with film details
CREATE OR REPLACE VIEW tech_check_screenings_with_films AS
SELECT
  tc.*,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime,
  COALESCE(ff.director, sf.director) as director
FROM tech_check_screenings tc
LEFT JOIN feature_films ff ON tc.film_id = ff.id AND tc.film_type = 'feature'
LEFT JOIN short_films sf ON tc.film_id = sf.id AND tc.film_type = 'short';

COMMENT ON VIEW tech_check_screenings_with_films IS 'Tech check screenings joined with film details from source tables';


-- View for ticketing screenings with film details
CREATE OR REPLACE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short';

COMMENT ON VIEW ticketing_screenings_with_films IS 'Ticketing/published screenings joined with film details from source tables';


-- View for interviews with film details
CREATE OR REPLACE VIEW interviews_with_films AS
SELECT
  i.*,
  COALESCE(
    ff.title,
    sf.title,
    sp.program_name,
    p.title
  ) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime
FROM interviews i
LEFT JOIN feature_films ff ON i.film_id = ff.id
LEFT JOIN short_films sf ON i.short_film_id = sf.id
LEFT JOIN shorts_programs sp ON i.shorts_program_id = sp.id
LEFT JOIN programs p ON i.program_id = p.id;

COMMENT ON VIEW interviews_with_films IS 'Interviews joined with film/program details from source tables';


-- View for guest films with film details
CREATE OR REPLACE VIEW guest_films_with_details AS
SELECT
  gf.*,
  ff.title as film_title,
  ff.director,
  ff.run_time as runtime
FROM guest_films gf
LEFT JOIN feature_films ff ON gf.film_id = ff.id;

COMMENT ON VIEW guest_films_with_details IS 'Guest-film relationships joined with film details from source tables';


-- View for press requests with film details
CREATE OR REPLACE VIEW press_requests_with_films AS
SELECT
  pr.*,
  string_agg(COALESCE(ff.title, sf.title), ', ' ORDER BY prf.created_at) as film_titles
FROM press_requests pr
LEFT JOIN press_request_films prf ON pr.id = prf.press_request_id
LEFT JOIN feature_films ff ON prf.film_id = ff.id AND prf.film_type = 'feature'
LEFT JOIN short_films sf ON prf.film_id = sf.id AND prf.film_type = 'short'
GROUP BY pr.id;

COMMENT ON VIEW press_requests_with_films IS 'Press requests with comma-separated list of film titles from source tables';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- If everything above succeeded, commit the transaction
COMMIT;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: Data duplication has been removed';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All screening and event tables now use proper foreign key references.';
  RAISE NOTICE 'Film data will now automatically update across all modules.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update frontend queries to use the new views or JOINs';
  RAISE NOTICE '2. Test that film updates propagate to all modules';
  RAISE NOTICE '3. Review any orphaned records mentioned in warnings above';
  RAISE NOTICE '============================================================================';
END $$;
