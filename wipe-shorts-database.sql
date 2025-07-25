-- Script to wipe shorts database tables
-- This will remove all shorts and shorts programs data

-- First, remove all short films (this will automatically clear the foreign key references)
DELETE FROM short_films;

-- Then, remove all shorts programs
DELETE FROM shorts_programs;

-- Reset the auto-increment sequences (if using PostgreSQL)
-- This ensures IDs start from 1 again when you re-upload
ALTER SEQUENCE IF EXISTS short_films_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS shorts_programs_id_seq RESTART WITH 1;

-- Verify the tables are empty
SELECT COUNT(*) as short_films_count FROM short_films;
SELECT COUNT(*) as shorts_programs_count FROM shorts_programs;