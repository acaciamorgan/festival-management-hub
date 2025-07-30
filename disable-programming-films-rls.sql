-- Disable Row Level Security on programming_films table
-- This allows unrestricted access for the rough draft space

ALTER TABLE programming_films DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'programming_films';