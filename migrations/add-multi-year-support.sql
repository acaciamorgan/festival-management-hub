-- ============================================================================
-- MULTI-YEAR ARCHIVE SYSTEM - PHASE 1: ADD FESTIVAL_YEAR COLUMNS
-- ============================================================================
-- This migration adds festival_year support to all tables
-- Backfills existing data with year 2025
-- Creates festival_settings table for year management
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE FESTIVAL_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS festival_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  is_archived BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE festival_settings IS 'Manages festival years and their archive status';
COMMENT ON COLUMN festival_settings.year IS 'Festival year (e.g., 2025, 2026)';
COMMENT ON COLUMN festival_settings.is_archived IS 'If true, year is read-only for non-admins';

-- Insert 2025 as the current active year
INSERT INTO festival_settings (year, is_archived, start_date, end_date)
VALUES (2025, false, '2025-10-17', '2025-10-27')
ON CONFLICT (year) DO NOTHING;

-- ============================================================================
-- STEP 2: ADD FESTIVAL_YEAR TO CORE TABLES
-- ============================================================================

-- Core reference tables
ALTER TABLE feature_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE short_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE shorts_programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE press ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 3: ADD FESTIVAL_YEAR TO SCREENING MODULES
-- ============================================================================

ALTER TABLE press_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE ticketing_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE pi_jury_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE tech_check_screenings ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 4: ADD FESTIVAL_YEAR TO PRESS & MEDIA MODULES
-- ============================================================================

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE press_requests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE screener_access ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 5: ADD FESTIVAL_YEAR TO EVENT MODULES (HYBRID)
-- ============================================================================

ALTER TABLE photo_shoots ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpets ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_events ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 6: ADD FESTIVAL_YEAR TO JUNCTION TABLES
-- ============================================================================

ALTER TABLE press_request_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE photo_shoot_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE photo_shoot_subjects ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpet_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE red_carpet_subjects ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_event_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE special_event_guests ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 7: ADD FESTIVAL_YEAR TO GUEST MANAGEMENT
-- ============================================================================

ALTER TABLE guest_films ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE guest_programs ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE in_attendance ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 8: ADD FESTIVAL_YEAR TO OTHER TABLES
-- ============================================================================

ALTER TABLE theater_houses ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS festival_year INTEGER DEFAULT 2025;

-- ============================================================================
-- STEP 9: BACKFILL ALL EXISTING DATA WITH 2025
-- ============================================================================

-- Core tables
UPDATE feature_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE short_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE shorts_programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE guests SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE venues SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE contacts SET festival_year = 2025 WHERE festival_year IS NULL;

-- Screenings
UPDATE press_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE ticketing_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE pi_jury_screenings SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE tech_check_screenings SET festival_year = 2025 WHERE festival_year IS NULL;

-- Press & Media
UPDATE interviews SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE press_requests SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE screener_access SET festival_year = 2025 WHERE festival_year IS NULL;

-- Events
UPDATE photo_shoots SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpets SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_events SET festival_year = 2025 WHERE festival_year IS NULL;

-- Junction tables
UPDATE press_request_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE photo_shoot_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE photo_shoot_subjects SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpet_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE red_carpet_subjects SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_event_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE special_event_guests SET festival_year = 2025 WHERE festival_year IS NULL;

-- Guest management
UPDATE guest_films SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE guest_programs SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE in_attendance SET festival_year = 2025 WHERE festival_year IS NULL;

-- Other
UPDATE theater_houses SET festival_year = 2025 WHERE festival_year IS NULL;
UPDATE sticky_notes SET festival_year = 2025 WHERE festival_year IS NULL;

-- ============================================================================
-- STEP 10: MAKE FESTIVAL_YEAR NOT NULL (AFTER BACKFILL)
-- ============================================================================

-- Core tables
ALTER TABLE feature_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE short_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE shorts_programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE guests ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE venues ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN festival_year SET NOT NULL;

-- Screenings
ALTER TABLE press_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE ticketing_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE pi_jury_screenings ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE tech_check_screenings ALTER COLUMN festival_year SET NOT NULL;

-- Press & Media
ALTER TABLE interviews ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE press_requests ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE screener_access ALTER COLUMN festival_year SET NOT NULL;

-- Events
ALTER TABLE photo_shoots ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpets ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_events ALTER COLUMN festival_year SET NOT NULL;

-- Junction tables
ALTER TABLE press_request_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE photo_shoot_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE photo_shoot_subjects ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpet_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE red_carpet_subjects ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_event_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE special_event_guests ALTER COLUMN festival_year SET NOT NULL;

-- Guest management
ALTER TABLE guest_films ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE guest_programs ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE in_attendance ALTER COLUMN festival_year SET NOT NULL;

-- Other
ALTER TABLE theater_houses ALTER COLUMN festival_year SET NOT NULL;
ALTER TABLE sticky_notes ALTER COLUMN festival_year SET NOT NULL;

-- ============================================================================
-- STEP 11: CREATE INDICES FOR PERFORMANCE
-- ============================================================================

-- Core tables
CREATE INDEX IF NOT EXISTS idx_feature_films_year ON feature_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_short_films_year ON short_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_shorts_programs_year ON shorts_programs(festival_year);
CREATE INDEX IF NOT EXISTS idx_programs_year ON programs(festival_year);
CREATE INDEX IF NOT EXISTS idx_guests_year ON guests(festival_year);
CREATE INDEX IF NOT EXISTS idx_venues_year ON venues(festival_year);
CREATE INDEX IF NOT EXISTS idx_press_year ON press(festival_year);
CREATE INDEX IF NOT EXISTS idx_contacts_year ON contacts(festival_year);

-- Screenings
CREATE INDEX IF NOT EXISTS idx_press_screenings_year ON press_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_ticketing_screenings_year ON ticketing_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_pi_jury_screenings_year ON pi_jury_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_tech_check_screenings_year ON tech_check_screenings(festival_year);

-- Press & Media
CREATE INDEX IF NOT EXISTS idx_interviews_year ON interviews(festival_year);
CREATE INDEX IF NOT EXISTS idx_press_requests_year ON press_requests(festival_year);
CREATE INDEX IF NOT EXISTS idx_screener_access_year ON screener_access(festival_year);

-- Events
CREATE INDEX IF NOT EXISTS idx_photo_shoots_year ON photo_shoots(festival_year);
CREATE INDEX IF NOT EXISTS idx_red_carpets_year ON red_carpets(festival_year);
CREATE INDEX IF NOT EXISTS idx_special_events_year ON special_events(festival_year);

-- ============================================================================
-- STEP 12: ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN feature_films.festival_year IS 'Festival year this film belongs to (e.g., 2025, 2026)';
COMMENT ON COLUMN short_films.festival_year IS 'Festival year this film belongs to';
COMMENT ON COLUMN guests.festival_year IS 'Festival year this guest attended';
COMMENT ON COLUMN venues.festival_year IS 'Festival year for this venue record';
COMMENT ON COLUMN press_screenings.festival_year IS 'Festival year for this screening';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  tables_with_year INTEGER;
BEGIN
  -- Count tables that now have festival_year column
  SELECT COUNT(DISTINCT table_name)
  INTO tables_with_year
  FROM information_schema.columns
  WHERE column_name = 'festival_year'
  AND table_schema = 'public';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MULTI-YEAR SUPPORT MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✓ festival_settings table created';
  RAISE NOTICE '✓ festival_year column added to % tables', tables_with_year;
  RAISE NOTICE '✓ All existing data backfilled with year 2025';
  RAISE NOTICE '✓ Indices created for performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update frontend to use FestivalYearContext';
  RAISE NOTICE '2. Update all queries to filter by festival_year';
  RAISE NOTICE '3. Add year selector UI to header';
  RAISE NOTICE '4. Test creating a new year (2026)';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
