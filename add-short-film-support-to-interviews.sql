-- Add short film support to interview management
-- Run this in your Supabase SQL Editor

-- 1. Add short_film_id column to interviews table
ALTER TABLE interviews
ADD COLUMN short_film_id UUID NULL REFERENCES short_films(id) ON DELETE CASCADE;

-- 2. Update the constraint to include short films
ALTER TABLE interviews
DROP CONSTRAINT interview_has_film_or_program;

ALTER TABLE interviews
ADD CONSTRAINT interview_has_film_or_program CHECK (
  film_id IS NOT NULL OR
  shorts_program_id IS NOT NULL OR
  program_id IS NOT NULL OR
  short_film_id IS NOT NULL
);

-- 3. Create guest_short_films junction table for guest-short film relationships
CREATE TABLE IF NOT EXISTS guest_short_films (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    short_film_id UUID REFERENCES short_films(id) ON DELETE CASCADE,
    film_title TEXT NOT NULL, -- stored for quick access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_interviews_short_film_id ON interviews(short_film_id);
CREATE INDEX idx_guest_short_films_guest_id ON guest_short_films(guest_id);
CREATE INDEX idx_guest_short_films_short_film_id ON guest_short_films(short_film_id);

-- Note: RLS not enabled - following project conventions

-- 7. Add helpful comment
COMMENT ON COLUMN interviews.short_film_id IS 'Reference to individual short film within a shorts program';
COMMENT ON TABLE guest_short_films IS 'Junction table linking guests to individual short films';