DROP VIEW IF EXISTS press_screenings_for_grid CASCADE;
CREATE VIEW press_screenings_for_grid AS
SELECT
  ps.id,
  ps.film_id,
  ps.film_type,
  'P&I'::text as screening_type,
  ps.screening_date,
  trim(to_char(ps.screening_date, 'Day')) as day_of_week,
  ps.screening_time as start_time,
  ps.short_code as venue_short_code,
  ps.notes,
  ps.canceled as is_cancelled,
  NOT (COALESCE(ps.film_approved, false) AND COALESCE(ps.locked, false)) as is_tentative,
  COALESCE(ps.film_approved, false) as film_approved,
  COALESCE(ps.locked, false) as locked,
  ps.festival_year,
  ps.created_at,
  ps.updated_at,
  ps.created_by,
  COALESCE(ff.title, sf.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM press_screenings ps
LEFT JOIN feature_films ff ON ps.film_id = ff.id AND ps.film_type = 'feature'
LEFT JOIN short_films sf ON ps.film_id = sf.id AND ps.film_type = 'short'
WHERE ps.canceled = false;
