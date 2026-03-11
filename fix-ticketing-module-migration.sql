BEGIN;

ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS film_type VARCHAR(20);
ALTER TABLE published_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER;

ALTER TABLE ticketing_screenings DROP CONSTRAINT IF EXISTS ticketing_screenings_film_type_check;
ALTER TABLE ticketing_screenings ADD CONSTRAINT ticketing_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

ALTER TABLE pi_jury_screenings DROP CONSTRAINT IF EXISTS pi_jury_screenings_film_type_check;
ALTER TABLE pi_jury_screenings ADD CONSTRAINT pi_jury_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

ALTER TABLE tech_check_screenings DROP CONSTRAINT IF EXISTS tech_check_screenings_film_type_check;
ALTER TABLE tech_check_screenings ADD CONSTRAINT tech_check_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

ALTER TABLE published_screenings ADD CONSTRAINT published_screenings_film_type_check
  CHECK (film_type IN ('feature', 'short', 'shorts_program'));

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
LEFT JOIN shorts_programs sp ON tc.film_id = sp.id AND tc.film_type = 'shorts_program';

UPDATE published_screenings ps
SET film_id = ff.id, film_type = 'feature'
FROM feature_films ff
WHERE ps.film_id IS NULL AND ps.film_title = ff.title;

UPDATE published_screenings ps
SET film_id = sp.id, film_type = 'shorts_program'
FROM shorts_programs sp
WHERE ps.film_id IS NULL AND ps.film_title = sp.program_name;

CREATE INDEX IF NOT EXISTS idx_published_screenings_film_id ON published_screenings(film_id);
CREATE INDEX IF NOT EXISTS idx_published_screenings_festival_year ON published_screenings(festival_year);

COMMIT;
