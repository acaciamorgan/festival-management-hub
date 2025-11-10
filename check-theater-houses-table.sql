-- Check theater_houses table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'theater_houses'
ORDER BY ordinal_position;
