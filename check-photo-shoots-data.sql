-- Check what's actually in the photo_shoots table
SELECT id, film_program_description, subjects_description, shoot_date, festival_year, created_at
FROM photo_shoots
ORDER BY created_at DESC
LIMIT 5;

-- Check junction table data
SELECT * FROM photo_shoot_films
ORDER BY photo_shoot_id DESC
LIMIT 5;

-- Check what the view returns
SELECT id, film_program_display_combined, subjects_display_combined, shoot_date, festival_year
FROM photo_shoots_with_details
ORDER BY created_at DESC
LIMIT 5;
