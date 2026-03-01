-- ============================================================================
-- Fix Missing/Stale Views for In Attendance Module
-- RUN ON PRODUCTION: 2026-02-28
--
-- Problem 1: guest_film_titles view was never created on production.
--            Production still uses pre-phase7 schema (separate guest_films,
--            guest_short_films, guest_programs tables without film_type column).
--            This view unions all three tables to match the interface the code expects.
--
-- Problem 2: ticketing_screenings_with_films view was created before
--            festival_year column was added to ticketing_screenings,
--            so the view doesn't expose festival_year.
--
-- Both are non-destructive — no data changes.
-- ============================================================================

-- 1. Create guest_film_titles view
-- Unions across the three pre-phase7 guest-film junction tables
-- to provide a unified view with film_type discrimination
DROP VIEW IF EXISTS guest_film_titles CASCADE;

CREATE VIEW guest_film_titles AS
SELECT
  gf.id,
  gf.guest_id,
  gf.film_id,
  'feature' as film_type,
  gf.festival_year,
  ff.title AS film_title
FROM guest_films gf
LEFT JOIN feature_films ff ON gf.film_id = ff.id
UNION ALL
SELECT
  gsf.id,
  gsf.guest_id,
  gsf.short_film_id as film_id,
  'short' as film_type,
  sf.festival_year,
  sf.title AS film_title
FROM guest_short_films gsf
LEFT JOIN short_films sf ON gsf.short_film_id = sf.id
WHERE gsf.short_film_id IS NOT NULL
UNION ALL
SELECT
  gp.id,
  gp.guest_id,
  gp.program_id as film_id,
  'program' as film_type,
  gp.festival_year,
  p.title AS film_title
FROM guest_programs gp
LEFT JOIN programs p ON gp.program_id = p.id;


-- 2. Recreate ticketing_screenings_with_films view
-- DROP + CREATE to force PostgreSQL to re-resolve ts.* with the festival_year column
DROP VIEW IF EXISTS ticketing_screenings_with_films CASCADE;

CREATE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as runtime,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short';
