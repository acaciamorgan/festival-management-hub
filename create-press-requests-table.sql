-- Create press_requests table
CREATE TABLE IF NOT EXISTS press_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requester information
  requester_name TEXT NOT NULL,
  requester_outlet TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('screener_link', 'screening_ticket')),
  film_titles TEXT NOT NULL, -- Comma-separated list of film/program titles
  
  -- Screening details (for ticket requests)
  screening_id TEXT, -- ID of the selected screening
  screening_type TEXT, -- 'published', 'pi_jury', or 'tech_check' 
  screening_date DATE, -- Auto-filled from selected screening
  screening_time TIME, -- Auto-filled from selected screening
  venue_short_code TEXT, -- Auto-filled from selected screening
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'requested', 'fulfilled')),
  requested_at TIMESTAMP, -- When email was sent to contact
  fulfilled_at TIMESTAMP, -- When directly fulfilled
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for common queries
CREATE INDEX idx_press_requests_status ON press_requests(status);
CREATE INDEX idx_press_requests_created_at ON press_requests(created_at);
CREATE INDEX idx_press_requests_requester_email ON press_requests(requester_email);

-- Enable RLS
ALTER TABLE press_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all press requests" 
  ON press_requests FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert press requests" 
  ON press_requests FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update press requests" 
  ON press_requests FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete press requests" 
  ON press_requests FOR DELETE 
  USING (true);