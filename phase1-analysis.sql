-- ============================================================================
-- PHASE 1: READ-ONLY ANALYSIS
-- ============================================================================
-- This script analyzes current data to predict migration outcomes
-- COMPLETELY SAFE - No data is modified
-- ============================================================================

-- Basic counts for all three modules
-- ============================================================================
SELECT '=== PHOTO SHOOTS COUNTS ===' as analysis;

SELECT
  COUNT(*) as total_photo_shoots,
  COUNT(film_program_display) as shoots_with_film_data,
  COUNT(subjects_display) as shoots_with_subject_data,
  COUNT(venue_name) as shoots_with_venue_cache
FROM photo_shoots;

SELECT '=== RED CARPETS COUNTS ===' as analysis;

SELECT
  COUNT(*) as total_red_carpets,
  COUNT(film_program_display) as carpets_with_film_data,
  COUNT(subjects_display) as carpets_with_subject_data,
  COUNT(venue_name) as carpets_with_venue_cache
FROM red_carpets;

SELECT '=== SPECIAL EVENTS COUNTS ===' as analysis;

SELECT
  COUNT(*) as total_special_events,
  COUNT(films_programs_display) as events_with_film_data,
  COUNT(guests_display) as events_with_guest_data,
  COUNT(venue_contact_name) as events_with_venue_contact_cache
FROM special_events;


-- Analyze Photo Shoots - Films Matching
-- ============================================================================
SELECT '=== PHOTO SHOOTS - FILM MATCHING ANALYSIS ===' as analysis;

WITH film_items AS (
  SELECT
    id,
    TRIM(unnest(string_to_array(film_program_display, ','))) as film_name
  FROM photo_shoots
  WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
),
match_check AS (
  SELECT
    film_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
        THEN 'feature'
      WHEN EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
        THEN 'short'
      WHEN EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
        THEN 'shorts_program'
      WHEN EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
        THEN 'program'
      ELSE 'NO_MATCH'
    END as match_status
  FROM film_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched film examples
SELECT '=== PHOTO SHOOTS - UNMATCHED FILMS (Examples) ===' as analysis;

WITH film_items AS (
  SELECT
    TRIM(unnest(string_to_array(film_program_display, ','))) as film_name
  FROM photo_shoots
  WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
)
SELECT DISTINCT
  film_name,
  'Will become free text' as migration_result
FROM film_items
WHERE NOT EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
LIMIT 10;


-- Analyze Photo Shoots - Subjects Matching
-- ============================================================================
SELECT '=== PHOTO SHOOTS - SUBJECT MATCHING ANALYSIS ===' as analysis;

WITH subject_items AS (
  SELECT
    TRIM(unnest(string_to_array(subjects_display, ','))) as subject_name
  FROM photo_shoots
  WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
),
match_check AS (
  SELECT
    subject_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM guests WHERE name = subject_items.subject_name)
        THEN 'MATCHED'
      ELSE 'NO_MATCH'
    END as match_status
  FROM subject_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched subject examples
SELECT '=== PHOTO SHOOTS - UNMATCHED SUBJECTS (Examples) ===' as analysis;

WITH subject_items AS (
  SELECT
    TRIM(unnest(string_to_array(subjects_display, ','))) as subject_name
  FROM photo_shoots
  WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
)
SELECT DISTINCT
  subject_name,
  'Will become free text' as migration_result
FROM subject_items
WHERE NOT EXISTS (SELECT 1 FROM guests WHERE name = subject_items.subject_name)
LIMIT 10;


-- Analyze Red Carpets - Films Matching
-- ============================================================================
SELECT '=== RED CARPETS - FILM MATCHING ANALYSIS ===' as analysis;

WITH film_items AS (
  SELECT
    TRIM(unnest(string_to_array(film_program_display, ','))) as film_name
  FROM red_carpets
  WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
),
match_check AS (
  SELECT
    film_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
        THEN 'feature'
      WHEN EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
        THEN 'short'
      WHEN EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
        THEN 'shorts_program'
      WHEN EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
        THEN 'program'
      ELSE 'NO_MATCH'
    END as match_status
  FROM film_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched film examples
SELECT '=== RED CARPETS - UNMATCHED FILMS (Examples) ===' as analysis;

WITH film_items AS (
  SELECT
    TRIM(unnest(string_to_array(film_program_display, ','))) as film_name
  FROM red_carpets
  WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
)
SELECT DISTINCT
  film_name,
  'Will become free text' as migration_result
FROM film_items
WHERE NOT EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
LIMIT 10;


-- Analyze Red Carpets - Subjects Matching
-- ============================================================================
SELECT '=== RED CARPETS - SUBJECT MATCHING ANALYSIS ===' as analysis;

WITH subject_items AS (
  SELECT
    TRIM(unnest(string_to_array(subjects_display, ','))) as subject_name
  FROM red_carpets
  WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
),
match_check AS (
  SELECT
    subject_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM guests WHERE name = subject_items.subject_name)
        THEN 'MATCHED'
      ELSE 'NO_MATCH'
    END as match_status
  FROM subject_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched subject examples
SELECT '=== RED CARPETS - UNMATCHED SUBJECTS (Examples) ===' as analysis;

WITH subject_items AS (
  SELECT
    TRIM(unnest(string_to_array(subjects_display, ','))) as subject_name
  FROM red_carpets
  WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
)
SELECT DISTINCT
  subject_name,
  'Will become free text' as migration_result
FROM subject_items
WHERE NOT EXISTS (SELECT 1 FROM guests WHERE name = subject_items.subject_name)
LIMIT 10;


-- Analyze Special Events - Films Matching
-- ============================================================================
SELECT '=== SPECIAL EVENTS - FILM MATCHING ANALYSIS ===' as analysis;

WITH film_items AS (
  SELECT
    TRIM(unnest(string_to_array(films_programs_display, ','))) as film_name
  FROM special_events
  WHERE films_programs_display IS NOT NULL
    AND films_programs_display != ''
),
match_check AS (
  SELECT
    film_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
        THEN 'feature'
      WHEN EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
        THEN 'short'
      WHEN EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
        THEN 'shorts_program'
      WHEN EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
        THEN 'program'
      ELSE 'NO_MATCH'
    END as match_status
  FROM film_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched film examples
SELECT '=== SPECIAL EVENTS - UNMATCHED FILMS (Examples) ===' as analysis;

WITH film_items AS (
  SELECT
    TRIM(unnest(string_to_array(films_programs_display, ','))) as film_name
  FROM special_events
  WHERE films_programs_display IS NOT NULL
    AND films_programs_display != ''
)
SELECT DISTINCT
  film_name,
  'Will become free text' as migration_result
FROM film_items
WHERE NOT EXISTS (SELECT 1 FROM feature_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM short_films WHERE title = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM shorts_programs WHERE program_name = film_items.film_name)
  AND NOT EXISTS (SELECT 1 FROM programs WHERE title = film_items.film_name)
LIMIT 10;


-- Analyze Special Events - Guests Matching
-- ============================================================================
SELECT '=== SPECIAL EVENTS - GUEST MATCHING ANALYSIS ===' as analysis;

WITH guest_items AS (
  SELECT
    TRIM(unnest(string_to_array(guests_display, ','))) as guest_name
  FROM special_events
  WHERE guests_display IS NOT NULL
    AND guests_display != ''
),
match_check AS (
  SELECT
    guest_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM guests WHERE name = guest_items.guest_name)
        THEN 'MATCHED'
      ELSE 'NO_MATCH'
    END as match_status
  FROM guest_items
)
SELECT
  match_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM match_check
GROUP BY match_status
ORDER BY count DESC;

-- Show unmatched guest examples
SELECT '=== SPECIAL EVENTS - UNMATCHED GUESTS (Examples) ===' as analysis;

WITH guest_items AS (
  SELECT
    TRIM(unnest(string_to_array(guests_display, ','))) as guest_name
  FROM special_events
  WHERE guests_display IS NOT NULL
    AND guests_display != ''
)
SELECT DISTINCT
  guest_name,
  'Will become free text' as migration_result
FROM guest_items
WHERE NOT EXISTS (SELECT 1 FROM guests WHERE name = guest_items.guest_name)
LIMIT 10;


-- Summary Report
-- ============================================================================
SELECT '=== MIGRATION SUMMARY ===' as analysis;

SELECT
  'Photo Shoots' as module,
  (SELECT COUNT(*) FROM photo_shoots) as total_records,
  (SELECT COUNT(*) FROM photo_shoots WHERE film_program_display IS NOT NULL) as has_film_data,
  (SELECT COUNT(*) FROM photo_shoots WHERE subjects_display IS NOT NULL) as has_subject_data;

SELECT
  'Red Carpets' as module,
  (SELECT COUNT(*) FROM red_carpets) as total_records,
  (SELECT COUNT(*) FROM red_carpets WHERE film_program_display IS NOT NULL) as has_film_data,
  (SELECT COUNT(*) FROM red_carpets WHERE subjects_display IS NOT NULL) as has_subject_data;

SELECT
  'Special Events' as module,
  (SELECT COUNT(*) FROM special_events) as total_records,
  (SELECT COUNT(*) FROM special_events WHERE films_programs_display IS NOT NULL) as has_film_data,
  (SELECT COUNT(*) FROM special_events WHERE guests_display IS NOT NULL) as has_guest_data;
