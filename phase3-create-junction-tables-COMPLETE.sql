-- ============================================================================
-- PHASE 3: CREATE JUNCTION TABLES FOR ALL THREE MODULES
-- ============================================================================
-- This script creates junction tables to link all three modules to films and guests
-- SAFE: Only creating new tables, not modifying existing data
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHOTO SHOOTS - Create Junction Tables
-- ============================================================================

-- Create photo_shoot_films junction table
CREATE TABLE IF NOT EXISTS photo_shoot_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_shoot_id UUID NOT NULL REFERENCES photo_shoots(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (
    film_type IN ('feature', 'short', 'shorts_program', 'program')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_shoot_id, film_id, film_type)
);

CREATE INDEX IF NOT EXISTS idx_photo_shoot_films_shoot
  ON photo_shoot_films(photo_shoot_id);
CREATE INDEX IF NOT EXISTS idx_photo_shoot_films_film
  ON photo_shoot_films(film_id);

COMMENT ON TABLE photo_shoot_films
  IS 'Junction table linking photo shoots to films/programs (many-to-many)';
COMMENT ON COLUMN photo_shoot_films.photo_shoot_id
  IS 'Foreign key to photo_shoots table';
COMMENT ON COLUMN photo_shoot_films.film_id
  IS 'Foreign key to feature_films, short_films, shorts_programs, or programs table (check film_type)';
COMMENT ON COLUMN photo_shoot_films.film_type
  IS 'Indicates which table film_id references: feature, short, shorts_program, or program';


-- Create photo_shoot_subjects junction table
CREATE TABLE IF NOT EXISTS photo_shoot_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_shoot_id UUID NOT NULL REFERENCES photo_shoots(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_shoot_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_shoot_subjects_shoot
  ON photo_shoot_subjects(photo_shoot_id);
CREATE INDEX IF NOT EXISTS idx_photo_shoot_subjects_guest
  ON photo_shoot_subjects(guest_id);

COMMENT ON TABLE photo_shoot_subjects
  IS 'Junction table linking photo shoots to guests/subjects (many-to-many)';
COMMENT ON COLUMN photo_shoot_subjects.photo_shoot_id
  IS 'Foreign key to photo_shoots table';
COMMENT ON COLUMN photo_shoot_subjects.guest_id
  IS 'Foreign key to guests table';


-- ============================================================================
-- RED CARPETS - Create Junction Tables
-- ============================================================================

-- Create red_carpet_films junction table
CREATE TABLE IF NOT EXISTS red_carpet_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  red_carpet_id UUID NOT NULL REFERENCES red_carpets(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (
    film_type IN ('feature', 'short', 'shorts_program', 'program')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(red_carpet_id, film_id, film_type)
);

CREATE INDEX IF NOT EXISTS idx_red_carpet_films_carpet
  ON red_carpet_films(red_carpet_id);
CREATE INDEX IF NOT EXISTS idx_red_carpet_films_film
  ON red_carpet_films(film_id);

COMMENT ON TABLE red_carpet_films
  IS 'Junction table linking red carpets to films/programs (many-to-many)';
COMMENT ON COLUMN red_carpet_films.red_carpet_id
  IS 'Foreign key to red_carpets table';
COMMENT ON COLUMN red_carpet_films.film_id
  IS 'Foreign key to feature_films, short_films, shorts_programs, or programs table (check film_type)';
COMMENT ON COLUMN red_carpet_films.film_type
  IS 'Indicates which table film_id references: feature, short, shorts_program, or program';


-- Create red_carpet_subjects junction table
CREATE TABLE IF NOT EXISTS red_carpet_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  red_carpet_id UUID NOT NULL REFERENCES red_carpets(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(red_carpet_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_red_carpet_subjects_carpet
  ON red_carpet_subjects(red_carpet_id);
CREATE INDEX IF NOT EXISTS idx_red_carpet_subjects_guest
  ON red_carpet_subjects(guest_id);

COMMENT ON TABLE red_carpet_subjects
  IS 'Junction table linking red carpets to guests/subjects (many-to-many)';
COMMENT ON COLUMN red_carpet_subjects.red_carpet_id
  IS 'Foreign key to red_carpets table';
COMMENT ON COLUMN red_carpet_subjects.guest_id
  IS 'Foreign key to guests table';


-- ============================================================================
-- SPECIAL EVENTS - Create Junction Tables
-- ============================================================================

-- Create special_event_films junction table
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


-- ============================================================================
-- VERIFICATION: Check that all tables were created
-- ============================================================================
DO $$
DECLARE
  ps_films_exists BOOLEAN;
  ps_subjects_exists BOOLEAN;
  rc_films_exists BOOLEAN;
  rc_subjects_exists BOOLEAN;
  se_films_exists BOOLEAN;
  se_guests_exists BOOLEAN;
BEGIN
  -- Check if all tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_shoot_films'
  ) INTO ps_films_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_shoot_subjects'
  ) INTO ps_subjects_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'red_carpet_films'
  ) INTO rc_films_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'red_carpet_subjects'
  ) INTO rc_subjects_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'special_event_films'
  ) INTO se_films_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'special_event_guests'
  ) INTO se_guests_exists;

  -- Report results
  IF ps_films_exists AND ps_subjects_exists AND
     rc_films_exists AND rc_subjects_exists AND
     se_films_exists AND se_guests_exists THEN

    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✓ ALL JUNCTION TABLES CREATED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Photo Shoots:';
    RAISE NOTICE '  ✓ photo_shoot_films';
    RAISE NOTICE '  ✓ photo_shoot_subjects';
    RAISE NOTICE '';
    RAISE NOTICE 'Red Carpets:';
    RAISE NOTICE '  ✓ red_carpet_films';
    RAISE NOTICE '  ✓ red_carpet_subjects';
    RAISE NOTICE '';
    RAISE NOTICE 'Special Events:';
    RAISE NOTICE '  ✓ special_event_films';
    RAISE NOTICE '  ✓ special_event_guests';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'All existing data remains intact.';
    RAISE NOTICE 'Old display columns unchanged.';
    RAISE NOTICE 'Ready to proceed to Phase 4 (smart migration with matching).';
    RAISE NOTICE '============================================================================';
  ELSE
    RAISE EXCEPTION 'Failed to create all junction tables';
  END IF;
END $$;

COMMIT;
