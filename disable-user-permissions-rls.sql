-- Disable RLS on user_permissions table and remove all policies
-- Run this in Supabase SQL Editor

-- 1. Disable Row Level Security on user_permissions table
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- 2. Drop any existing RLS policies on user_permissions table
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can update own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can update all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Service role full access" ON user_permissions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_permissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_permissions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_permissions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_permissions;

-- 3. Grant public access to user_permissions table (since no RLS)
GRANT ALL ON user_permissions TO authenticated;
GRANT ALL ON user_permissions TO anon;

-- 4. Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_permissions';