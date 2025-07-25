-- Update short_films table to add Festival Program and Genre fields
-- Run this in your Supabase SQL Editor

-- Add Festival Program fields (separate from Shorts Programs)
ALTER TABLE short_films 
ADD COLUMN program_1 TEXT,
ADD COLUMN program_2 TEXT,
ADD COLUMN program_3 TEXT,
ADD COLUMN genre_1 TEXT,
ADD COLUMN genre_2 TEXT,
ADD COLUMN genre_3 TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_short_films_program_1 ON short_films(program_1);
CREATE INDEX IF NOT EXISTS idx_short_films_program_2 ON short_films(program_2);
CREATE INDEX IF NOT EXISTS idx_short_films_program_3 ON short_films(program_3);
CREATE INDEX IF NOT EXISTS idx_short_films_genre_1 ON short_films(genre_1);
CREATE INDEX IF NOT EXISTS idx_short_films_genre_2 ON short_films(genre_2);
CREATE INDEX IF NOT EXISTS idx_short_films_genre_3 ON short_films(genre_3);