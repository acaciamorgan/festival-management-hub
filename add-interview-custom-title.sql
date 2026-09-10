BEGIN;

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS custom_title TEXT;

ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interview_has_film_or_program;

ALTER TABLE interviews ADD CONSTRAINT interview_has_film_or_program_or_title CHECK (
  film_id IS NOT NULL OR
  shorts_program_id IS NOT NULL OR
  program_id IS NOT NULL OR
  short_film_id IS NOT NULL OR
  custom_title IS NOT NULL
);

DROP VIEW IF EXISTS interviews_with_films CASCADE;

CREATE VIEW interviews_with_films AS
SELECT
  i.*,
  COALESCE(
    ff.title,
    sf.title,
    sp.program_name,
    p.title,
    i.custom_title
  ) as title,
  COALESCE(ff.run_time, sf.run_time) as run_time,
  CASE
    WHEN i.film_id IS NOT NULL THEN 'feature'
    WHEN i.short_film_id IS NOT NULL THEN 'short'
    WHEN i.shorts_program_id IS NOT NULL THEN 'shorts_program'
    WHEN i.program_id IS NOT NULL THEN 'program'
    ELSE NULL
  END as reference_type,
  COALESCE(pr.name, i.journalist_name) as resolved_journalist_name,
  COALESCE(pr.media_outlet, i.outlet) as resolved_outlet,
  COALESCE(pr.email, i.email) as resolved_email
FROM interviews i
LEFT JOIN feature_films ff ON i.film_id = ff.id
LEFT JOIN short_films sf ON i.short_film_id = sf.id
LEFT JOIN shorts_programs sp ON i.shorts_program_id = sp.id
LEFT JOIN programs p ON i.program_id = p.id
LEFT JOIN press pr ON i.press_id = pr.id;

COMMIT;
