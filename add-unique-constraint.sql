-- Add unique constraint on title field to enable proper upsert behavior
-- This will prevent duplicate films and allow updates to existing records

-- First, remove any actual duplicates that might exist
DELETE FROM feature_films 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM feature_films 
  GROUP BY title
);

-- Add unique constraint on title
ALTER TABLE feature_films 
ADD CONSTRAINT unique_film_title UNIQUE (title);

-- Note: Run this in your Supabase SQL Editor
-- This will allow upsert operations to work properly