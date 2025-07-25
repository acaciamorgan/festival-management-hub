-- Clear all film data from feature_films table
-- Run this in your Supabase SQL Editor to delete all existing films

DELETE FROM feature_films;

-- Optional: Reset the auto-increment counter if needed
-- (This isn't necessary since we use UUIDs, but included for completeness)

-- Verify deletion
SELECT COUNT(*) as remaining_films FROM feature_films;