-- Check if event tables reference theater houses
SELECT 'photo_shoots' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'photo_shoots'
  AND (column_name LIKE '%house%' OR column_name LIKE '%theater%')

UNION ALL

SELECT 'red_carpets' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'red_carpets'
  AND (column_name LIKE '%house%' OR column_name LIKE '%theater%')

UNION ALL

SELECT 'special_events' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'special_events'
  AND (column_name LIKE '%house%' OR column_name LIKE '%theater%');
