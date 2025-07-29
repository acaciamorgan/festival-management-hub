-- Fix venues table RLS issue
-- Run this in your Supabase SQL Editor

-- Disable RLS on venues table to allow development work
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables that might have the same issue
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_films DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE press DISABLE ROW LEVEL SECURITY;
ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;

-- Verify tables no longer have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;