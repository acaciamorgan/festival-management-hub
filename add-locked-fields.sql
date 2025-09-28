-- Add film_approved and locked columns to pi_jury_screenings table
ALTER TABLE pi_jury_screenings
ADD COLUMN IF NOT EXISTS film_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Update is_tentative based on the new logic (tentative if not both approved AND locked)
UPDATE pi_jury_screenings
SET is_tentative = NOT (film_approved AND locked);

-- Update existing records based on press_screenings data
UPDATE pi_jury_screenings pj
SET
  film_approved = COALESCE(ps.film_approved, false),
  locked = COALESCE(ps.locked, false),
  is_tentative = NOT (COALESCE(ps.film_approved, false) AND COALESCE(ps.locked, false))
FROM press_screenings ps
WHERE pj.film_title = ps.title
  AND pj.screening_date = ps.screening_date
  AND pj.screening_type = 'P&I';