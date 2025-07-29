-- First, let's check what columns the published_screenings table currently has
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'published_screenings' 
ORDER BY ordinal_position;

-- If the table has the wrong structure, we need to recreate it
-- Drop and recreate the published_screenings table with correct structure
DROP TABLE IF EXISTS published_screenings CASCADE;

CREATE TABLE published_screenings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticketing_screening_id UUID NOT NULL,
  film_card_id UUID,
  film_title TEXT NOT NULL,
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER,
  venue_short_code TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  published_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add trigger
CREATE TRIGGER update_published_screenings_updated_at 
  BEFORE UPDATE ON published_screenings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_published_screenings_date ON published_screenings(screening_date);
CREATE INDEX idx_published_screenings_venue ON published_screenings(venue_short_code);
CREATE INDEX idx_published_screenings_ticketing_id ON published_screenings(ticketing_screening_id);

-- Disable RLS
ALTER TABLE published_screenings DISABLE ROW LEVEL SECURITY;