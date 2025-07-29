-- Comprehensive fix for all RLS issues in Film Festival system
-- Run this in your Supabase SQL Editor

-- First, check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Disable RLS on all module-related tables
ALTER TABLE press_screenings DISABLE ROW LEVEL SECURITY;
ALTER TABLE red_carpets DISABLE ROW LEVEL SECURITY;
ALTER TABLE photo_shoots DISABLE ROW LEVEL SECURITY;
ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_crew DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_formats DISABLE ROW LEVEL SECURITY;
ALTER TABLE venue_houses DISABLE ROW LEVEL SECURITY;
ALTER TABLE screener_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticketing_grid DISABLE ROW LEVEL SECURITY;
ALTER TABLE festival_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tributes_grid DISABLE ROW LEVEL SECURITY;
ALTER TABLE sticky_notes DISABLE ROW LEVEL SECURITY;

-- Also ensure the related junction/linking tables have RLS disabled
ALTER TABLE film_press_screenings DISABLE ROW LEVEL SECURITY;
ALTER TABLE press_screenings_press DISABLE ROW LEVEL SECURITY;
ALTER TABLE film_guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_rsvps DISABLE ROW LEVEL SECURITY;

-- Verify all tables no longer have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;