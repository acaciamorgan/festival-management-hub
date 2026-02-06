-- Multi-Year Archive System Migration
-- Adds festival_year to all tables and backfills with 2025

BEGIN;

-- Create festival_settings table
CREATE TABLE IF NOT EXISTS festival_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  is_archived BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 2025 as current year
INSERT INTO festival_settings (year, is_archived, start_date, end_date)
VALUES (2025, false, '2025-10-17', '2025-10-27')
ON CONFLICT (year) DO NOTHING;

-- Add festival_year to core tables
ALTER TABLE feature_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE short_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE shorts_programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE press ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to screening modules
ALTER TABLE press_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to press & media modules
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE screener_access ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to event modules
ALTER TABLE photo_shoots ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpets ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_events ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to junction tables
ALTER TABLE press_request_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE photo_shoot_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE photo_shoot_subjects ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpet_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpet_subjects ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_event_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_event_guests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to guest management
ALTER TABLE guest_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE guest_programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE in_attendance ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Add festival_year to other tables
ALTER TABLE theater_houses ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- Backfill existing data with 2025
UPDATE feature_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE short_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE shorts_programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE guests SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE venues SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE contacts SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE ticketing_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE pi_jury_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE tech_check_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE interviews SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press_requests SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE screener_access SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE photo_shoots SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpets SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_events SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press_request_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE photo_shoot_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE photo_shoot_subjects SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpet_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpet_subjects SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_event_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_event_guests SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE guest_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE guest_programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE in_attendance SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE theater_houses SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE sticky_notes SET festival_year = 2025 WHERE festival_year IS NULL;

-- Make festival_year NOT NULL
ALTER TABLE feature_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE short_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE shorts_programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE guests ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE venues ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE ticketing_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE pi_jury_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE tech_check_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE interviews ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press_requests ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE screener_access ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE photo_shoots ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpets ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_events ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press_request_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE photo_shoot_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE photo_shoot_subjects ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpet_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpet_subjects ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_event_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_event_guests ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE guest_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE guest_programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE in_attendance ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE theater_houses ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE sticky_notes ALTER COLUMN festival_year SET NOT NULL;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_feature_films_year ON feature_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_short_films_year ON short_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_shorts_programs_year ON shorts_programs(festival_year);
CREATE INDEX IF NOT EXISTS idx_programs_year ON programs(festival_year);
CREATE INDEX IF NOT EXISTS idx_guests_year ON guests(festival_year);
CREATE INDEX IF NOT EXISTS idx_venues_year ON venues(festival_year);
CREATE INDEX IF NOT EXISTS idx_press_year ON press(festival_year);
CREATE INDEX IF NOT EXISTS idx_contacts_year ON contacts(festival_year);
CREATE INDEX IF NOT EXISTS idx_press_screenings_year ON press_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_ticketing_screenings_year ON ticketing_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_pi_jury_screenings_year ON pi_jury_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_tech_check_screenings_year ON tech_check_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_interviews_year ON interviews(festival_year);
CREATE INDEX IF NOT EXISTS idx_press_requests_year ON press_requests(festival_year);
CREATE INDEX IF NOT EXISTS idx_screener_access_year ON screener_access(festival_year);
CREATE INDEX IF NOT EXISTS idx_photo_shoots_year ON photo_shoots(festival_year);
CREATE INDEX IF NOT EXISTS idx_red_carpets_year ON red_carpets(festival_year);
CREATE INDEX IF NOT EXISTS idx_special_events_year ON special_events(festival_year);

COMMIT;
