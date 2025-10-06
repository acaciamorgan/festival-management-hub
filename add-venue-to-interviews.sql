-- Add venue_id and show_on_special_events to interviews table
-- This allows interviews to be associated with venues and shown on the Special Events calendar

-- Add venue_id column (foreign key to venues table)
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Add show_on_special_events column (boolean flag)
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS show_on_special_events BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_interviews_venue_id ON interviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_interviews_show_on_special_events ON interviews(show_on_special_events);

-- Create composite index for querying interviews to show on special events
CREATE INDEX IF NOT EXISTS idx_interviews_special_events_filter
ON interviews(show_on_special_events, status, interview_date)
WHERE show_on_special_events = true AND status IN ('Scheduled', 'Complete');

-- Add comment explaining the purpose
COMMENT ON COLUMN interviews.venue_id IS 'Optional venue reference for interviews taking place at a structured venue (e.g., Filmmakers Lounge)';
COMMENT ON COLUMN interviews.show_on_special_events IS 'When true, this interview will appear on the Special Events calendar and timeline views';
