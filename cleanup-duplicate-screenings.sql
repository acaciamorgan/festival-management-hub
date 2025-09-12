-- Remove duplicate screenings created by broken CSV upload
-- Keep only one instance of each unique screening (date/time/venue/title combination)

-- First, identify duplicates
WITH duplicate_screenings AS (
  SELECT 
    film_title,
    screening_date,
    start_time,
    venue_short_code,
    COUNT(*) as duplicate_count,
    MIN(id::text)::integer as keep_id
  FROM ticketing_screenings 
  GROUP BY film_title, screening_date, start_time, venue_short_code
  HAVING COUNT(*) > 1
),
-- Get IDs of duplicates to delete (keep the first one, delete the rest)
duplicates_to_delete AS (
  SELECT ts.id
  FROM ticketing_screenings ts
  INNER JOIN duplicate_screenings ds ON 
    ts.film_title = ds.film_title AND
    ts.screening_date = ds.screening_date AND
    ts.start_time = ds.start_time AND
    ts.venue_short_code = ds.venue_short_code
  WHERE ts.id != ds.keep_id
)
-- Delete the duplicate records
DELETE FROM ticketing_screenings 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Also clean up any orphaned published_screenings that reference deleted ticketing_screenings
DELETE FROM published_screenings 
WHERE ticketing_screening_id NOT IN (SELECT id FROM ticketing_screenings);