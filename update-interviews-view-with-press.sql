-- ============================================================================
-- UPDATE INTERVIEWS VIEW - ADD PRESS DATA RESOLUTION
-- ============================================================================
-- This migration updates the interviews_with_films view to also resolve
-- journalist information from the press table, eliminating cached text.
-- ============================================================================

BEGIN;

-- Drop and recreate the view with press data join
DROP VIEW IF EXISTS interviews_with_films CASCADE;

CREATE VIEW interviews_with_films AS
SELECT
  i.*,
  -- Film/program title resolved from source tables
  COALESCE(
    ff.title,
    sf.title,
    sp.program_name,
    p.title
  ) as title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  -- Reference type for the frontend to know which table was matched
  CASE
    WHEN i.film_id IS NOT NULL THEN 'feature'
    WHEN i.short_film_id IS NOT NULL THEN 'short'
    WHEN i.shorts_program_id IS NOT NULL THEN 'shorts_program'
    WHEN i.program_id IS NOT NULL THEN 'program'
    ELSE NULL
  END as reference_type,
  -- Press data resolved from press table (falls back to cached text fields)
  COALESCE(pr.name, i.journalist_name) as resolved_journalist_name,
  COALESCE(pr.media_outlet, i.outlet) as resolved_outlet,
  COALESCE(pr.email, i.email) as resolved_email
FROM interviews i
LEFT JOIN feature_films ff ON i.film_id = ff.id
LEFT JOIN short_films sf ON i.short_film_id = sf.id
LEFT JOIN shorts_programs sp ON i.shorts_program_id = sp.id
LEFT JOIN programs p ON i.program_id = p.id
LEFT JOIN press pr ON i.press_id = pr.id;

COMMENT ON VIEW interviews_with_films IS 'Interviews with film/program details and resolved press data. Uses press table for journalist info when press_id is set, falls back to cached text.';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'interviews_with_films view updated with press data resolution';
END $$;
