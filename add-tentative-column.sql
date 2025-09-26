-- Add is_tentative column to pi_jury_screenings table
ALTER TABLE pi_jury_screenings
ADD COLUMN IF NOT EXISTS is_tentative BOOLEAN DEFAULT false;

-- Update existing records to set tentative status based on press_screenings film_approved
UPDATE pi_jury_screenings pj
SET is_tentative = NOT COALESCE(ps.film_approved, false)
FROM press_screenings ps
WHERE pj.film_title = ps.title
  AND pj.screening_date = ps.screening_date
  AND pj.start_time = ps.screening_time;