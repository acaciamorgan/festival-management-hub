-- Check if junction table exists and has data
SELECT COUNT(*) as junction_count FROM short_film_programs;

-- Check if short_films still has shorts_program_id data
SELECT COUNT(*) as films_with_programs FROM short_films WHERE shorts_program_id IS NOT NULL;

-- Show sample of shorts_program_id data that should be migrated
SELECT id, title, shorts_program_id, program_order FROM short_films WHERE shorts_program_id IS NOT NULL LIMIT 10;

-- Check what programs exist
SELECT id, program_name FROM shorts_programs ORDER BY program_number;