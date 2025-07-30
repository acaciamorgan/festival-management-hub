-- Remove created_by columns from ticketing tables
ALTER TABLE pi_jury_screenings DROP COLUMN IF EXISTS created_by;
ALTER TABLE tech_check_screenings DROP COLUMN IF EXISTS created_by;
ALTER TABLE published_screenings DROP COLUMN IF EXISTS published_by;