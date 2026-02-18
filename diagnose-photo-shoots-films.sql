-- Diagnostic queries for Photo Shoots film display issue

-- Query 1: Check what's in the photo_shoot_films junction table
SELECT
  psf.photo_shoot_id,
  psf.film_id,
  psf.film_type,
  psf.film_title,
  psf.festival_year,
  ps.shoot_date
FROM photo_shoot_films psf
LEFT JOIN photo_shoots ps ON psf.photo_shoot_id = ps.id
ORDER BY ps.shoot_date DESC
LIMIT 20;

-- Query 2: Check what's in the description fields (old free-text columns)
SELECT
  id,
  shoot_date,
  film_program_description,
  subjects_description,
  festival_year
FROM photo_shoots
ORDER BY shoot_date DESC
LIMIT 10;

-- Query 3: Check what the VIEW returns
SELECT
  id,
  shoot_date,
  linked_films_display,
  film_program_description,
  film_program_display_combined,
  festival_year
FROM photo_shoots_with_details
ORDER BY shoot_date DESC
LIMIT 10;

-- Query 4: Check if feature films exist in the database for current year
SELECT
  id,
  title,
  festival_year
FROM feature_films
WHERE festival_year = 2025
ORDER BY title
LIMIT 20;

-- Query 5: Check if short films exist in the database for current year
SELECT
  id,
  title,
  festival_year
FROM short_films
WHERE festival_year = 2025
ORDER BY title
LIMIT 20;

-- Query 6: For a specific photo shoot, see what it should be linking to
-- Replace the shoot_date '2025-10-19' with actual date from your screenshot if different
SELECT
  ps.id,
  ps.shoot_date,
  ps.film_program_description,
  COUNT(psf.id) as junction_count
FROM photo_shoots ps
LEFT JOIN photo_shoot_films psf ON ps.id = psf.photo_shoot_id
WHERE ps.shoot_date = '2025-10-19'
GROUP BY ps.id, ps.shoot_date, ps.film_program_description;
