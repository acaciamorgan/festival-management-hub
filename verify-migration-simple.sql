-- ============================================================================
-- SIMPLE MIGRATION VERIFICATION
-- ============================================================================

-- PHOTO SHOOTS Statistics
SELECT
  'PHOTO SHOOTS' as module,
  COUNT(*) as total_records,
  COUNT(CASE WHEN film_program_display IS NOT NULL AND film_program_display != '' THEN 1 END) as had_films,
  (SELECT COUNT(DISTINCT photo_shoot_id) FROM photo_shoot_films) as matched_films,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) as free_text_films,
  COUNT(CASE WHEN subjects_display IS NOT NULL AND subjects_display != '' THEN 1 END) as had_subjects,
  (SELECT COUNT(DISTINCT photo_shoot_id) FROM photo_shoot_subjects) as matched_subjects,
  COUNT(CASE WHEN subjects_description IS NOT NULL AND subjects_description != '' THEN 1 END) as free_text_subjects
FROM photo_shoots;

-- RED CARPETS Statistics
SELECT
  'RED CARPETS' as module,
  COUNT(*) as total_records,
  COUNT(CASE WHEN film_program_display IS NOT NULL AND film_program_display != '' THEN 1 END) as had_films,
  (SELECT COUNT(DISTINCT red_carpet_id) FROM red_carpet_films) as matched_films,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) as free_text_films,
  COUNT(CASE WHEN subjects_display IS NOT NULL AND subjects_display != '' THEN 1 END) as had_subjects,
  (SELECT COUNT(DISTINCT red_carpet_id) FROM red_carpet_subjects) as matched_subjects,
  COUNT(CASE WHEN subjects_description IS NOT NULL AND subjects_description != '' THEN 1 END) as free_text_subjects
FROM red_carpets;

-- SPECIAL EVENTS Statistics
SELECT
  'SPECIAL EVENTS' as module,
  COUNT(*) as total_records,
  COUNT(CASE WHEN films_programs_display IS NOT NULL AND films_programs_display != '' THEN 1 END) as had_films,
  (SELECT COUNT(DISTINCT special_event_id) FROM special_event_films) as matched_films,
  COUNT(CASE WHEN film_program_description IS NOT NULL AND film_program_description != '' THEN 1 END) as free_text_films,
  COUNT(CASE WHEN guests_display IS NOT NULL AND guests_display != '' THEN 1 END) as had_guests,
  (SELECT COUNT(DISTINCT special_event_id) FROM special_event_guests) as matched_guests,
  COUNT(CASE WHEN guests_description IS NOT NULL AND guests_description != '' THEN 1 END) as free_text_guests
FROM special_events;

-- Show a few examples from special_events
SELECT
  '--- SPECIAL EVENTS Examples ---' as section;

SELECT
  id,
  title,
  films_programs_display as original_films,
  film_program_description as free_text_films,
  guests_display as original_guests,
  guests_description as free_text_guests
FROM special_events
WHERE (films_programs_display IS NOT NULL AND films_programs_display != '')
   OR (guests_display IS NOT NULL AND guests_display != '')
LIMIT 10;
