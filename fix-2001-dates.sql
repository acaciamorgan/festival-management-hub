-- Fix all screening dates that were incorrectly stored as 2001
-- Convert 2001-MM-DD to 2024-MM-DD

UPDATE ticketing_screenings 
SET screening_date = CONCAT('2024', SUBSTR(screening_date, 5))
WHERE screening_date LIKE '2001-%';

-- Update the day_of_week to match the corrected dates
UPDATE ticketing_screenings 
SET day_of_week = TRIM(TO_CHAR(screening_date::date, 'Day'))
WHERE screening_date LIKE '2024-%';

-- Verify the fix
SELECT 
  film_title, 
  screening_date, 
  day_of_week,
  TO_CHAR(screening_date::date, 'Day') as calculated_day
FROM ticketing_screenings 
ORDER BY screening_date 
LIMIT 10;