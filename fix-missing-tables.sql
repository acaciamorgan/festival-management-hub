-- Create festival_years table if it doesn't exist
CREATE TABLE IF NOT EXISTS festival_years (
  year INTEGER PRIMARY KEY,
  edition TEXT,
  festival_name TEXT,
  start_date DATE,
  end_date DATE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create archive_festival_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS archive_festival_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_number INT,
  festival_name TEXT,
  start_date DATE,
  end_date DATE,
  important_links JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_year INT NOT NULL UNIQUE
);