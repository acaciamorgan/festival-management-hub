-- Add Lead Volunteer and Number of Vols columns to special_events table
ALTER TABLE special_events 
ADD COLUMN IF NOT EXISTS lead_volunteer TEXT,
ADD COLUMN IF NOT EXISTS number_of_vols TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_special_events_lead_volunteer ON special_events(lead_volunteer);