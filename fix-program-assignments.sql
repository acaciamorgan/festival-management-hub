-- Emergency fix: Restore program assignments to junction table
-- Run this to restore lost program assignments

-- First, let's see what we have
SELECT 'Films with program assignments:' as info, COUNT(*) as count FROM short_films WHERE shorts_program_id IS NOT NULL
UNION ALL
SELECT 'Junction table entries:' as info, COUNT(*) as count FROM short_film_programs
UNION ALL
SELECT 'Available programs:' as info, COUNT(*) as count FROM shorts_programs;

-- If junction table is empty but shorts_program_id has data, migrate it
INSERT INTO short_film_programs (short_film_id, shorts_program_id, program_order)
SELECT 
    id as short_film_id,
    shorts_program_id,
    COALESCE(program_order, 0) as program_order
FROM short_films
WHERE shorts_program_id IS NOT NULL
ON CONFLICT (short_film_id, shorts_program_id) DO NOTHING;

-- Verify the migration worked
SELECT 'After migration - Junction entries:' as info, COUNT(*) as count FROM short_film_programs;