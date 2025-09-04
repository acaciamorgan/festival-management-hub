-- Disable RLS on shorts_programs table
ALTER TABLE shorts_programs DISABLE ROW LEVEL SECURITY;

-- Also ensure no policies exist
DROP POLICY IF EXISTS "Enable all operations for all users" ON shorts_programs;
DROP POLICY IF EXISTS "Enable read access for all users" ON shorts_programs;
DROP POLICY IF EXISTS "Enable insert for all users" ON shorts_programs;
DROP POLICY IF EXISTS "Enable update for all users" ON shorts_programs;
DROP POLICY IF EXISTS "Enable delete for all users" ON shorts_programs;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'shorts_programs';