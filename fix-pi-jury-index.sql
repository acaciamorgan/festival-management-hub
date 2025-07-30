-- Drop the incorrectly named index
DROP INDEX IF EXISTS idx_pi_jury_screenings_date;

-- Create the correct index
CREATE INDEX idx_pi_jury_screenings_date ON pi_jury_screenings(screening_date);