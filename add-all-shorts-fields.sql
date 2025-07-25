-- Add ALL missing fields to short_films table to match the CSV data
-- Run this in your Supabase SQL Editor

ALTER TABLE short_films 
ADD COLUMN IF NOT EXISTS screenwriter TEXT,
ADD COLUMN IF NOT EXISTS cinematographer TEXT,
ADD COLUMN IF NOT EXISTS art_director TEXT,
ADD COLUMN IF NOT EXISTS editor TEXT,
ADD COLUMN IF NOT EXISTS principal_cast TEXT,
ADD COLUMN IF NOT EXISTS sound_designer TEXT,
ADD COLUMN IF NOT EXISTS music_score TEXT,
ADD COLUMN IF NOT EXISTS producer TEXT,
ADD COLUMN IF NOT EXISTS executive_producer TEXT,
ADD COLUMN IF NOT EXISTS production_companies TEXT,
ADD COLUMN IF NOT EXISTS film_website TEXT,
ADD COLUMN IF NOT EXISTS trailer_url TEXT,
ADD COLUMN IF NOT EXISTS premiere_status TEXT,
ADD COLUMN IF NOT EXISTS content_warnings TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'short_films' 
ORDER BY column_name;