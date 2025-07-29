-- Interview Management Schema
-- Add this to your Supabase SQL Editor

-- Create interviews table
CREATE TABLE interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Required film or program reference
  film_id UUID NULL REFERENCES feature_films(id) ON DELETE CASCADE,
  shorts_program_id UUID NULL REFERENCES shorts_programs(id) ON DELETE CASCADE,
  program_id UUID NULL REFERENCES programs(id) ON DELETE CASCADE,
  film_title TEXT, -- Cached title for display
  
  -- Journalist information (can link to press card or be open text)
  press_id UUID NULL REFERENCES press(id) ON DELETE SET NULL,
  journalist_name TEXT, -- Open text field, auto-filled from press card if linked
  outlet TEXT, -- Open text field, auto-filled from press card if linked
  email TEXT, -- Open text field, auto-filled from press card if linked
  
  -- Subject information (can link to guest cards or be open text)
  subject_names TEXT, -- Open text field for subjects/interviewees
  subject_guest_ids UUID[], -- Array of guest IDs if subjects have guest cards
  
  -- Interview details
  status TEXT NOT NULL DEFAULT 'TBD' CHECK (status IN ('TBD', 'Pitching', 'Subject Pending', 'Scheduled', 'Complete', 'Declined')),
  interview_date DATE,
  interview_time TIME,
  location TEXT, -- Can be phone, Zoom link, or physical location
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure at least one film/program reference exists
  CONSTRAINT interview_has_film_or_program CHECK (
    film_id IS NOT NULL OR 
    shorts_program_id IS NOT NULL OR 
    program_id IS NOT NULL
  )
);

-- Create indexes for performance
CREATE INDEX idx_interviews_film_id ON interviews(film_id);
CREATE INDEX idx_interviews_shorts_program_id ON interviews(shorts_program_id);
CREATE INDEX idx_interviews_program_id ON interviews(program_id);
CREATE INDEX idx_interviews_press_id ON interviews(press_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_interview_date ON interviews(interview_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER interviews_updated_at_trigger
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_interviews_updated_at();

-- Add RLS policies (enable when ready for production)
-- ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view all interviews" ON interviews FOR SELECT USING (true);
-- CREATE POLICY "Users can insert interviews" ON interviews FOR INSERT WITH CHECK (auth.uid() = created_by);
-- CREATE POLICY "Users can update their own interviews" ON interviews FOR UPDATE USING (auth.uid() = created_by);
-- CREATE POLICY "Users can delete their own interviews" ON interviews FOR DELETE USING (auth.uid() = created_by);