-- ============================================================================
-- MIGRATION VERIFICATION - Show Results of Phase 4 Migration
-- ============================================================================
-- This script shows side-by-side comparison of old vs new data
-- READ-ONLY: Does not modify any data
-- ============================================================================

-- ============================================================================
-- PHOTO SHOOTS - Migration Statistics
-- ============================================================================
SELECT
  '=== PHOTO SHOOTS - MIGRATION RESULTS ===' AS section;

SELECT
  COUNT(*) AS total_shoots,
  COUNT(CASE WHEN film_program_display IS NOT NULL AND film_program_display != '' THEN 1 END) AS had_film_data,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) AS saved_as_free_text_films
FROM photo_shoots;

SELECT
  COUNT(DISTINCT photo_shoot_id) AS shoots_with_matched_films,
  COUNT(*) AS total_film_links
FROM photo_shoot_films;

SELECT
  COUNT(CASE WHEN subjects_display IS NOT NULL AND subjects_display != '' THEN 1 END) AS had_subject_data,
  COUNT(CASE WHEN subjects_description IS NOT NULL AND subjects_description != '' THEN 1 END) AS saved_as_free_text_subjects
FROM photo_shoots;

SELECT
  COUNT(DISTINCT photo_shoot_id) AS shoots_with_matched_subjects,
  COUNT(*) AS total_subject_links
FROM photo_shoot_subjects;

-- Examples of matched films
SELECT
  '=== PHOTO SHOOTS - Examples of MATCHED films (now relational) ===' AS section;

SELECT
  ps.title AS photo_shoot,
  ps.film_program_display AS original_text,
  string_agg(
    COALESCE(ff.title, sf.title, sp.program_name, p.title),
    ', '
  ) AS matched_films
FROM photo_shoots ps
JOIN photo_shoot_films psf ON ps.id = psf.photo_shoot_id
LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
GROUP BY ps.id, ps.title, ps.film_program_display
LIMIT 5;

-- Examples of unmatched (free text)
SELECT
  '=== PHOTO SHOOTS - Examples of UNMATCHED films (saved as free text) ===' AS section;

SELECT
  title AS photo_shoot,
  film_program_display AS original_text,
  film_program_description AS free_text_saved
FROM photo_shoots
WHERE film_program_description IS NOT NULL
AND film_program_description != ''
LIMIT 5;


-- ============================================================================
-- RED CARPETS - Migration Statistics
-- ============================================================================
SELECT
  '=== RED CARPETS - MIGRATION RESULTS ===' AS section;

SELECT
  COUNT(*) AS total_carpets,
  COUNT(CASE WHEN film_program_display IS NOT NULL AND film_program_display != '' THEN 1 END) AS had_film_data,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) AS saved_as_free_text_films
FROM red_carpets;

SELECT
  COUNT(DISTINCT red_carpet_id) AS carpets_with_matched_films,
  COUNT(*) AS total_film_links
FROM red_carpet_films;

SELECT
  COUNT(CASE WHEN subjects_display IS NOT NULL AND subjects_display != '' THEN 1 END) AS had_subject_data,
  COUNT(CASE WHEN subjects_description IS NOT NULL AND subjects_description != '' THEN 1 END) AS saved_as_free_text_subjects
FROM red_carpets;

SELECT
  COUNT(DISTINCT red_carpet_id) AS carpets_with_matched_subjects,
  COUNT(*) AS total_subject_links
FROM red_carpet_subjects;

-- Examples of matched films
SELECT
  '=== RED CARPETS - Examples of MATCHED films (now relational) ===' AS section;

SELECT
  rc.title AS red_carpet,
  rc.film_program_display AS original_text,
  string_agg(
    COALESCE(ff.title, sf.title, sp.program_name, p.title),
    ', '
  ) AS matched_films
FROM red_carpets rc
JOIN red_carpet_films rcf ON rc.id = rcf.red_carpet_id
LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
GROUP BY rc.id, rc.title, rc.film_program_display
LIMIT 5;

-- Examples of unmatched (free text)
SELECT
  '=== RED CARPETS - Examples of UNMATCHED films (saved as free text) ===' AS section;

SELECT
  title AS red_carpet,
  film_program_display AS original_text,
  film_program_description AS free_text_saved
FROM red_carpets
WHERE film_program_description IS NOT NULL
AND film_program_description != ''
LIMIT 5;


-- ============================================================================
-- SPECIAL EVENTS - Migration Statistics
-- ============================================================================
SELECT
  '=== SPECIAL EVENTS - MIGRATION RESULTS ===' AS section;

SELECT
  COUNT(*) AS total_events,
  COUNT(CASE WHEN films_programs_display IS NOT NULL AND films_programs_display != '' THEN 1 END) AS had_film_data,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) AS saved_as_free_text_films
FROM special_events;

SELECT
  COUNT(DISTINCT special_event_id) AS events_with_matched_films,
  COUNT(*) AS total_film_links
FROM special_event_films;

SELECT
  COUNT(CASE WHEN guests_display IS NOT NULL AND guests_display != '' THEN 1 END) AS had_guest_data,
  COUNT(CASE WHEN guests_description IS NOT NULL AND guests_description != '' THEN 1 END) AS saved_as_free_text_guests
FROM special_events;

SELECT
  COUNT(DISTINCT special_event_id) AS events_with_matched_guests,
  COUNT(*) AS total_guest_links
FROM special_event_guests;

-- Examples of matched films
SELECT
  '=== SPECIAL EVENTS - Examples of MATCHED films (now relational) ===' AS section;

SELECT
  se.title AS special_event,
  se.films_programs_display AS original_text,
  string_agg(
    COALESCE(ff.title, sf.title, sp.program_name, p.title),
    ', '
  ) AS matched_films
FROM special_events se
JOIN special_event_films sef ON se.id = sef.special_event_id
LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
GROUP BY se.id, se.title, se.films_programs_display
LIMIT 5;

-- Examples of unmatched (free text)
SELECT
  '=== SPECIAL EVENTS - Examples of UNMATCHED films (saved as free text) ===' AS section;

SELECT
  title AS special_event,
  films_programs_display AS original_text,
  film_program_description AS free_text_saved
FROM special_events
WHERE film_program_description IS NOT NULL
AND film_program_description != ''
LIMIT 5;


-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT
  '=== VERIFICATION COMPLETE ===' AS section;

SELECT
  'Review the results above and verify:' AS instruction,
  '1. Matched items look correct (film titles match properly)' AS check1,
  '2. Unmatched items are reasonable (non-film descriptions, etc.)' AS check2,
  '3. No data appears to be missing' AS check3,
  '4. Old display columns are STILL INTACT for safety' AS safety_note;
