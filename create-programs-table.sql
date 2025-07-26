-- Create programs table for non-film festival events (panels, conferences, tributes, etc.)
-- Run this in your Supabase SQL Editor

CREATE TABLE programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Required field
  title TEXT NOT NULL,
  
  -- Optional fields
  event_date DATE,
  start_time TIME,
  end_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  participants TEXT,
  description TEXT,
  
  -- Industry Days designation
  is_industry_days BOOLEAN DEFAULT FALSE,
  
  -- Additional metadata
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT programs_title_check CHECK (length(title) > 0)
);

-- Create indexes for better performance
CREATE INDEX programs_event_date_idx ON programs(event_date);
CREATE INDEX programs_is_industry_days_idx ON programs(is_industry_days);
CREATE INDEX programs_venue_name_idx ON programs(venue_name);
CREATE INDEX programs_created_at_idx ON programs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Create policies for programs table
CREATE POLICY "Enable read access for all users" ON programs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON programs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON programs
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON programs
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();