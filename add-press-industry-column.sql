-- Add press_industry column to film_screenings table
ALTER TABLE film_screenings ADD COLUMN IF NOT EXISTS press_industry BOOLEAN DEFAULT FALSE;

-- Update the column comment
COMMENT ON COLUMN film_screenings.press_industry IS 'Indicates if this is a Press & Industry screening';