-- Create P&I/Jury screenings table
CREATE TABLE IF NOT EXISTS pi_jury_screenings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  film_title TEXT NOT NULL,
  screening_type TEXT NOT NULL CHECK (screening_type IN ('P&I', 'Jury')),
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER,
  venue_short_code TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_pi_jury_screenings_date ON pi_jury_screenings(screening_date);
CREATE INDEX idx_pi_jury_screenings_film ON pi_jury_screenings(film_title);
CREATE INDEX idx_pi_jury_screenings_type ON pi_jury_screenings(screening_type);

-- Enable Row Level Security
ALTER TABLE pi_jury_screenings ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations for now
CREATE POLICY "Enable all operations for pi_jury_screenings" ON pi_jury_screenings
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);