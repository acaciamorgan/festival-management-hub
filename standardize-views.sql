-- ============================================================================
-- STANDARDIZE ALL VIEWS - CONSISTENT NAMING CONVENTIONS
-- ============================================================================
-- Standards:
-- - film_title: For film titles in screening contexts
-- - run_time: Runtime in minutes (with underscore)
-- - shorts_program_name: For shorts program groupings
-- - program_title: For non-film events
-- - title: Generic field when context allows multiple types
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCREENING VIEWS (Ticketing Context - Show Shorts Program Name, Not Individual Shorts)
-- ============================================================================

-- Press Screenings
DROP VIEW IF EXISTS press_screenings_with_films CASCADE;
CREATE VIEW press_screenings_with_films AS
SELECT
  ps.*,
  COALESCE(ff.title, sf.title, sp.program_name) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM press_screenings ps
LEFT JOIN feature_films ff ON ps.film_id = ff.id AND ps.film_type = 'feature'
LEFT JOIN short_films sf ON ps.film_id = sf.id AND ps.film_type = 'short'
LEFT JOIN shorts_programs sp ON ps.film_id = sp.id AND ps.film_type = 'shorts_program';

COMMENT ON VIEW press_screenings_with_films IS 'Press screenings with film details. Shows shorts program name for shorts program screenings.';


-- Ticketing/Published Screenings
DROP VIEW IF EXISTS ticketing_screenings_with_films CASCADE;
CREATE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title, sp.program_name) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short'
LEFT JOIN shorts_programs sp ON ts.film_id = sp.id AND ts.film_type = 'shorts_program';

COMMENT ON VIEW ticketing_screenings_with_films IS 'Ticketing screenings with film details. Shows shorts program name for shorts program screenings.';


-- P&I/Jury Screenings
DROP VIEW IF EXISTS pi_jury_screenings_with_films CASCADE;
CREATE VIEW pi_jury_screenings_with_films AS
SELECT
  pj.*,
  COALESCE(ff.title, sf.title, sp.program_name) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM pi_jury_screenings pj
LEFT JOIN feature_films ff ON pj.film_id = ff.id AND pj.film_type = 'feature'
LEFT JOIN short_films sf ON pj.film_id = sf.id AND pj.film_type = 'short'
LEFT JOIN shorts_programs sp ON pj.film_id = sp.id AND pj.film_type = 'shorts_program';

COMMENT ON VIEW pi_jury_screenings_with_films IS 'P&I/Jury screenings with film details. Shows shorts program name for shorts program screenings.';


-- Tech Check Screenings
DROP VIEW IF EXISTS tech_check_screenings_with_films CASCADE;
CREATE VIEW tech_check_screenings_with_films AS
SELECT
  tc.*,
  COALESCE(ff.title, sf.title, sp.program_name) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM tech_check_screenings tc
LEFT JOIN feature_films ff ON tc.film_id = ff.id AND tc.film_type = 'feature'
LEFT JOIN short_films sf ON tc.film_id = sf.id AND tc.film_type = 'short'
LEFT JOIN shorts_programs sp ON tc.film_id = tc.id AND tc.film_type = 'shorts_program';

COMMENT ON VIEW tech_check_screenings_with_films IS 'Tech check screenings with film details. Shows shorts program name for shorts program screenings.';


-- ============================================================================
-- EVENT VIEWS (Can Reference Individual Shorts or Entire Programs)
-- ============================================================================

-- Interviews
DROP VIEW IF EXISTS interviews_with_films CASCADE;
CREATE VIEW interviews_with_films AS
SELECT
  i.*,
  COALESCE(
    ff.title,
    sf.title,
    sp.program_name,
    p.title
  ) as title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  CASE
    WHEN i.film_id IS NOT NULL THEN 'feature'
    WHEN i.short_film_id IS NOT NULL THEN 'short'
    WHEN i.shorts_program_id IS NOT NULL THEN 'shorts_program'
    WHEN i.program_id IS NOT NULL THEN 'program'
    ELSE NULL
  END as reference_type
FROM interviews i
LEFT JOIN feature_films ff ON i.film_id = ff.id
LEFT JOIN short_films sf ON i.short_film_id = sf.id
LEFT JOIN shorts_programs sp ON i.shorts_program_id = sp.id
LEFT JOIN programs p ON i.program_id = p.id;

COMMENT ON VIEW interviews_with_films IS 'Interviews with film/program details. Can show individual short film titles or shorts program names.';


-- ============================================================================
-- RELATIONSHIP VIEWS
-- ============================================================================

-- Guest Films
DROP VIEW IF EXISTS guest_films_with_details CASCADE;
CREATE VIEW guest_films_with_details AS
SELECT
  gf.*,
  ff.title as film_title,
  ff.director,
  ff.run_time
FROM guest_films gf
LEFT JOIN feature_films ff ON gf.film_id = ff.id;

COMMENT ON VIEW guest_films_with_details IS 'Guest-film relationships with film details from feature films table.';


-- Press Requests
DROP VIEW IF EXISTS press_requests_with_films CASCADE;
CREATE VIEW press_requests_with_films AS
SELECT
  pr.*,
  string_agg(
    COALESCE(ff.title, sf.title, sp.program_name),
    ', '
    ORDER BY prf.created_at
  ) as film_titles
FROM press_requests pr
LEFT JOIN press_request_films prf ON pr.id = prf.press_request_id
LEFT JOIN feature_films ff ON prf.film_id = ff.id AND prf.film_type = 'feature'
LEFT JOIN short_films sf ON prf.film_id = sf.id AND prf.film_type = 'short'
LEFT JOIN shorts_programs sp ON prf.film_id = sp.id AND prf.film_type = 'shorts_program'
GROUP BY pr.id;

COMMENT ON VIEW press_requests_with_films IS 'Press requests with comma-separated film/program titles.';


COMMIT;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'VIEWS STANDARDIZED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All views now use consistent naming:';
  RAISE NOTICE '- film_title: For films and shorts programs in screening contexts';
  RAISE NOTICE '- run_time: Runtime in minutes (with underscore)';
  RAISE NOTICE '- title: Generic field for interviews (can be film, short, program)';
  RAISE NOTICE '- reference_type: Indicates what type of entity is referenced';
  RAISE NOTICE '============================================================================';
END $$;
