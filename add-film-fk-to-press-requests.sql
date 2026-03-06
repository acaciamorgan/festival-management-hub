-- Migration: Add film FK columns to press_requests
-- Each press_requests row represents one film per request.
-- Previously stored film_titles TEXT only; now stores film_id + film_type for relational integrity.

-- Add film columns (none exist yet on the table)
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS film_type VARCHAR(20);
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS film_titles TEXT;

-- Update view to join directly from press_requests.film_id
DROP VIEW IF EXISTS press_requests_with_films CASCADE;
CREATE VIEW press_requests_with_films AS
SELECT
  pr.*,
  COALESCE(ff.title, sp.program_name, pr.film_titles) as film_title_resolved
FROM press_requests pr
LEFT JOIN feature_films ff ON pr.film_id = ff.id AND pr.film_type = 'feature'
LEFT JOIN shorts_programs sp ON pr.film_id = sp.id AND pr.film_type = 'shorts_program'
;
