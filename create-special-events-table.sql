-- Create special_events table for festival events management
-- Run this in your Supabase SQL Editor

CREATE TABLE special_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Core event information (only 'title' is required)
  title TEXT NOT NULL,
  event_type TEXT, -- "Reception", "Mixer", "Party", "Awards"
  
  -- Schedule (stored as strings to avoid timezone issues)
  event_date TEXT, -- YYYY-MM-DD format
  access_time TEXT, -- HH:MM format (staff setup time)
  start_time TEXT, -- HH:MM format (when guests arrive)
  end_time TEXT, -- HH:MM format (when event ends)
  
  -- Location
  venue_id UUID REFERENCES venues(id),
  venue_name TEXT, -- Cached for display
  venue_address TEXT, -- Auto-populated from venue
  location_details TEXT, -- Additional room/space details
  
  -- Associations (stored as comma-separated display strings)
  films_programs_display TEXT, -- "Film A, Film B, Program C"
  guests_display TEXT, -- "Guest A, Guest B, Guest C"
  
  -- Staff and logistics
  lead_staff TEXT,
  invited_tags TEXT, -- Smart tags: "Filmmakers, Sponsors, VIPs"
  number_expected TEXT, -- Open text field
  
  -- F&B
  beverages TEXT,
  bartender TEXT,
  food TEXT,
  caterer TEXT,
  
  -- Media
  photography BOOLEAN DEFAULT FALSE,
  photo_shoot_id UUID REFERENCES photo_shoots(id), -- Link to auto-created photo shoot
  open_press TEXT DEFAULT 'No', -- "Yes", "No", "Limited"
  
  -- RSVPs (Google Forms integration)
  rsvp_responder_link TEXT, -- Link to share for RSVPs
  rsvp_response_link TEXT, -- Link to view responses
  
  -- Post-event
  actual_attendance TEXT,
  notes TEXT,
  
  CONSTRAINT special_events_title_check CHECK (length(title) > 0)
);

-- Create indexes for better performance
CREATE INDEX special_events_event_date_idx ON special_events(event_date);
CREATE INDEX special_events_event_type_idx ON special_events(event_type);
CREATE INDEX special_events_venue_id_idx ON special_events(venue_id);
CREATE INDEX special_events_photography_idx ON special_events(photography);
CREATE INDEX special_events_created_at_idx ON special_events(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;

-- Create policies for special_events table
CREATE POLICY "Enable read access for all users" ON special_events
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON special_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON special_events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON special_events
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_special_events_updated_at BEFORE UPDATE ON special_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();