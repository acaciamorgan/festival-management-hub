-- Check if house field exists in event tables
SELECT 'photo_shoots' as table_name, column_name
FROM information_schema.columns
WHERE table_name = 'photo_shoots' AND column_name LIKE '%house%'

UNION ALL

SELECT 'red_carpets' as table_name, column_name
FROM information_schema.columns
WHERE table_name = 'red_carpets' AND column_name LIKE '%house%'

UNION ALL

SELECT 'special_events' as table_name, column_name
FROM information_schema.columns
WHERE table_name = 'special_events' AND column_name LIKE '%house%';
