-- ============================================================================
-- CHECK TABLE STRUCTURE - Find out what columns exist
-- ============================================================================

SELECT 'photo_shoots columns:' AS info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'photo_shoots'
ORDER BY ordinal_position;

SELECT 'red_carpets columns:' AS info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'red_carpets'
ORDER BY ordinal_position;

SELECT 'special_events columns:' AS info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'special_events'
ORDER BY ordinal_position;
