-- Clear all guest data from the database
-- Run this in your Supabase SQL Editor

-- Delete all guest-film relationships first (foreign key constraint)
DELETE FROM guest_films;

-- Delete all guest-program relationships
DELETE FROM guest_programs;

-- Delete all guests
DELETE FROM guests;

-- Reset sequences if needed (optional)
-- This ensures clean IDs when you start over
-- Note: UUID primary keys don't use sequences, so this may not be necessary
-- but including for completeness if you have any integer sequences

-- Verify deletion
SELECT COUNT(*) as remaining_guests FROM guests;
SELECT COUNT(*) as remaining_guest_films FROM guest_films;
SELECT COUNT(*) as remaining_guest_programs FROM guest_programs;