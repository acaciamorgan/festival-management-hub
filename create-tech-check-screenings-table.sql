-- Create Tech Check screenings table
CREATE TABLE IF NOT EXISTS tech_check_screenings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  film_title TEXT NOT NULL,
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER,
  venue_short_code TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  tech_contact TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tech_check_screenings_date ON tech_check_screenings(screening_date);
CREATE INDEX idx_tech_check_screenings_film ON tech_check_screenings(film_title);
CREATE INDEX idx_tech_check_screenings_venue ON tech_check_screenings(venue_short_code);

-- Enable Row Level Security
ALTER TABLE tech_check_screenings ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations for authenticated users
CREATE POLICY "Enable all operations for tech_check_screenings" ON tech_check_screenings
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);