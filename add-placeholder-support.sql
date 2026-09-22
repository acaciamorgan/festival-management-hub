ALTER TABLE tech_check_screenings
  ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placeholder_label TEXT,
  ADD COLUMN IF NOT EXISTS placeholder_duration INTEGER;

ALTER TABLE tech_check_screenings ALTER COLUMN film_id DROP NOT NULL;

ALTER TABLE tech_check_screenings
  ADD CONSTRAINT tech_check_film_or_placeholder
  CHECK (film_id IS NOT NULL OR is_placeholder = TRUE);

DROP VIEW IF EXISTS tech_check_screenings_with_films CASCADE;

CREATE VIEW tech_check_screenings_with_films AS
SELECT
  tc.*,
  CASE
    WHEN tc.is_placeholder THEN tc.placeholder_label
    ELSE COALESCE(ff.title, sf.title, sp.program_name)
  END AS film_title,
  CASE
    WHEN tc.is_placeholder THEN tc.placeholder_duration
    ELSE COALESCE(ff.run_time, sf.run_time)
  END AS run_time,
  COALESCE(ff.director, sf.director) AS director
FROM tech_check_screenings tc
LEFT JOIN feature_films ff ON tc.film_id = ff.id AND tc.film_type = 'feature'
LEFT JOIN short_films sf ON tc.film_id = sf.id AND tc.film_type = 'short'
LEFT JOIN shorts_programs sp ON tc.film_id = sp.id AND tc.film_type = 'shorts_program';
