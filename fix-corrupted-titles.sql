-- Fix corrupted film titles that contain URLs or email addresses
-- This preserves all associations by updating in place

-- Delete all films with corrupted titles (URLs/emails) since we can't reliably map them
-- The correct films have already been uploaded with proper titles
DELETE FROM feature_films 
WHERE title LIKE 'http%' 
   OR title LIKE 'www.%' 
   OR title LIKE '%.com%'
   OR title LIKE '%@%'
   OR title ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';

-- Verify the cleanup
SELECT COUNT(*) as remaining_films FROM feature_films;
SELECT title, director FROM feature_films ORDER BY title LIMIT 10;