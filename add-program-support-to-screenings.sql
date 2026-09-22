ALTER TABLE ticketing_screenings DROP CONSTRAINT IF EXISTS ticketing_screenings_film_type_check;
ALTER TABLE ticketing_screenings ADD CONSTRAINT ticketing_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program', 'program'));

ALTER TABLE published_screenings DROP CONSTRAINT IF EXISTS published_screenings_film_type_check;
ALTER TABLE published_screenings ADD CONSTRAINT published_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program', 'program'));

DROP VIEW IF EXISTS ticketing_screenings_with_films CASCADE;
CREATE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title, sp.program_name, p.title) as film_title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short'
LEFT JOIN shorts_programs sp ON ts.film_id = sp.id AND ts.film_type = 'shorts_program'
LEFT JOIN programs p ON ts.film_id = p.id AND ts.film_type = 'program';
