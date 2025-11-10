-- Verify Phase 2 columns were added successfully

SELECT
  'photo_shoots' as table_name,
  column_name,
  data_type,
  '✓ EXISTS' as status
FROM information_schema.columns
WHERE table_name = 'photo_shoots'
  AND column_name IN ('film_program_description', 'subjects_description')

UNION ALL

SELECT
  'red_carpets' as table_name,
  column_name,
  data_type,
  '✓ EXISTS' as status
FROM information_schema.columns
WHERE table_name = 'red_carpets'
  AND column_name IN ('film_program_description', 'subjects_description')

UNION ALL

SELECT
  'special_events' as table_name,
  column_name,
  data_type,
  '✓ EXISTS' as status
FROM information_schema.columns
WHERE table_name = 'special_events'
  AND column_name IN ('film_program_description', 'guests_description')

ORDER BY table_name, column_name;
