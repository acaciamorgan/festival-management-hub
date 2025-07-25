-- Temporary fix: Disable RLS for development
-- Run this in your Supabase SQL Editor to fix the infinite recursion error

-- Disable RLS on the tables causing issues
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_films DISABLE ROW LEVEL SECURITY;
ALTER TABLE short_films DISABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_programs DISABLE ROW LEVEL SECURITY;

-- Keep RSVP tables enabled since they don't reference user_permissions
-- ALTER TABLE rsvp_forms DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE rsvp_responses DISABLE ROW LEVEL SECURITY; 
-- ALTER TABLE rsvp_tokens DISABLE ROW LEVEL SECURITY;

-- Note: This is a temporary development fix
-- When ready for production, we'll need to fix the recursive policies properly