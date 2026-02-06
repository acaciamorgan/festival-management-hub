-- ============================================================================
-- DIAGNOSTIC: Photo Shoots Database State
-- ============================================================================
-- This script checks if all required tables, columns, and views exist
-- ============================================================================

-- Check 1: Does photo_shoots table exist and have the new columns?
-- ============================================================================
SELECT
  'Photo Shoots Table Check' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'photo_shoots'
  ) as table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoots'
    AND column_name = 'film_program_description'
  ) as has_film_program_description,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoots'
    AND column_name = 'subjects_description'
  ) as has_subjects_description,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoots'
    AND column_name = 'film_program_display'
  ) as has_old_film_program_display,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_shoots'
    AND column_name = 'subjects_display'
  ) as has_old_subjects_display;

-- Check 2: Do junction tables exist?
-- ============================================================================
SELECT
  'Junction Tables Check' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'photo_shoot_films'
  ) as photo_shoot_films_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'photo_shoot_subjects'
  ) as photo_shoot_subjects_exists;

-- Check 3: Does the view exist?
-- ============================================================================
SELECT
  'View Check' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'photo_shoots_with_details'
  ) as view_exists;

-- Check 4: How many records in each table?
-- ============================================================================
SELECT
  'photo_shoots' as table_name,
  COUNT(*) as record_count
FROM photo_shoots
UNION ALL
SELECT
  'photo_shoot_films' as table_name,
  COUNT(*) as record_count
FROM photo_shoot_films
UNION ALL
SELECT
  'photo_shoot_subjects' as table_name,
  COUNT(*) as record_count
FROM photo_shoot_subjects;

-- Check 5: Sample data from photo_shoots (first 3 rows)
-- ============================================================================
SELECT
  id,
  shoot_date,
  film_program_display,
  subjects_display,
  film_program_description,
  subjects_description,
  venue_id
FROM photo_shoots
ORDER BY shoot_date DESC
LIMIT 3;

-- Check 6: Check junction table data
-- ============================================================================
SELECT
  'photo_shoot_films' as junction_table,
  COUNT(*) as total_links
FROM photo_shoot_films
UNION ALL
SELECT
  'photo_shoot_subjects' as junction_table,
  COUNT(*) as total_links
FROM photo_shoot_subjects;

-- Check 7: Test the view (if it exists)
-- ============================================================================
SELECT
  id,
  shoot_date,
  film_program_display_combined,
  subjects_display_combined,
  venue_name_from_fk,
  linked_films_display,
  linked_subjects_display
FROM photo_shoots_with_details
ORDER BY shoot_date DESC
LIMIT 3;

-- Check 8: Core reference tables exist?
-- ============================================================================
SELECT
  'Core Tables Check' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_films') as feature_films_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'short_films') as short_films_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shorts_programs') as shorts_programs_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') as programs_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guests') as guests_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') as venues_exists;
