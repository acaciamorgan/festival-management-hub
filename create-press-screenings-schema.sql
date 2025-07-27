-- Press Screenings Table
CREATE TABLE press_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Film Information
  film_id UUID NOT NULL,
  film_type VARCHAR(10) NOT NULL CHECK (film_type IN ('feature', 'short')),
  title VARCHAR(500) NOT NULL, -- Denormalized for easier querying
  runtime INTEGER, -- Runtime in minutes, pulled from film card
  
  -- Screening Details
  screening_date DATE,
  screening_time TIME,
  venue_id UUID REFERENCES venues(id),
  house VARCHAR(200), -- Theater house name
  
  -- Status Checkboxes
  film_approved BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  invites_out BOOLEAN DEFAULT false,
  canceled BOOLEAN DEFAULT false,
  
  -- Staff and Notes
  staffer VARCHAR(200),
  notes TEXT,
  
  -- RSVP Integration (Google Forms)
  rsvp_form_url TEXT, -- The responder view form URL
  rsvp_responses_url TEXT, -- The responses backend URL
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE press_screenings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all press screenings
CREATE POLICY "Users can view press screenings" ON press_screenings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert press screenings
CREATE POLICY "Users can insert press screenings" ON press_screenings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update press screenings
CREATE POLICY "Users can update press screenings" ON press_screenings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete press screenings
CREATE POLICY "Users can delete press screenings" ON press_screenings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_press_screenings_film_id ON press_screenings(film_id);
CREATE INDEX idx_press_screenings_venue_id ON press_screenings(venue_id);
CREATE INDEX idx_press_screenings_date ON press_screenings(screening_date);
CREATE INDEX idx_press_screenings_created_by ON press_screenings(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_press_screenings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_press_screenings_updated_at
  BEFORE UPDATE ON press_screenings
  FOR EACH ROW
  EXECUTE FUNCTION update_press_screenings_updated_at();