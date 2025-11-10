-- ============================================================================
-- PHASE 3: CREATE JUNCTION TABLES FOR SPECIAL EVENTS
-- ============================================================================
-- This script creates junction tables to link special events to films and guests
-- SAFE: Only creating new tables, not modifying existing data
-- ============================================================================
-- NOTE: photo_shoot_films, photo_shoot_subjects, red_carpet_films, and
--       red_carpet_subjects already exist, so we only create for special_events
-- ============================================================================

BEGIN;

-- Create special_event_films junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS special_event_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_event_id UUID NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (
    film_type IN ('feature', 'short', 'shorts_program', 'program')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(special_event_id, film_id, film_type)
);

CREATE INDEX IF NOT EXISTS idx_special_event_films_event
  ON special_event_films(special_event_id);
CREATE INDEX IF NOT EXISTS idx_special_event_films_film
  ON special_event_films(film_id);

COMMENT ON TABLE special_event_films
  IS 'Junction table linking special events to films/programs (many-to-many)';
COMMENT ON COLUMN special_event_films.special_event_id
  IS 'Foreign key to special_events table';
COMMENT ON COLUMN special_event_films.film_id
  IS 'Foreign key to feature_films, short_films, shorts_programs, or programs table (check film_type)';
COMMENT ON COLUMN special_event_films.film_type
  IS 'Indicates which table film_id references: feature, short, shorts_program, or program';


-- Create special_event_guests junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS special_event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_event_id UUID NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(special_event_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_special_event_guests_event
  ON special_event_guests(special_event_id);
CREATE INDEX IF NOT EXISTS idx_special_event_guests_guest
  ON special_event_guests(guest_id);

COMMENT ON TABLE special_event_guests
  IS 'Junction table linking special events to guests (many-to-many)';
COMMENT ON COLUMN special_event_guests.special_event_id
  IS 'Foreign key to special_events table';
COMMENT ON COLUMN special_event_guests.guest_id
  IS 'Foreign key to guests table';


-- Verification: Check that tables were created
-- ============================================================================
DO $$
DECLARE
  films_table_exists BOOLEAN;
  guests_table_exists BOOLEAN;
  films_count INTEGER;
  guests_count INTEGER;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'special_event_films'
  ) INTO films_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'special_event_guests'
  ) INTO guests_table_exists;

  IF films_table_exists AND guests_table_exists THEN
    RAISE NOTICE '✓ Junction tables created successfully';

    -- Show current counts (should be 0 for new tables)
    SELECT COUNT(*) INTO films_count FROM special_event_films;
    SELECT COUNT(*) INTO guests_count FROM special_event_guests;

    RAISE NOTICE '  - special_event_films: % rows (empty, ready for migration)', films_count;
    RAISE NOTICE '  - special_event_guests: % rows (empty, ready for migration)', guests_count;
  ELSE
    RAISE EXCEPTION 'Failed to create junction tables';
  END IF;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PHASE 3 COMPLETE: Junction tables created for special events';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'All existing data remains intact.';
  RAISE NOTICE 'Old display columns still unchanged.';
  RAISE NOTICE 'Ready to proceed to Phase 4 (smart migration with matching).';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
