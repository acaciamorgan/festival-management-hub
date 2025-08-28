-- Add archive_festival_settings table
CREATE TABLE IF NOT EXISTS public.archive_festival_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_number INT,
  festival_name TEXT,
  start_date DATE,
  end_date DATE,
  important_links JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_year INT NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_archive_festival_settings_year ON public.archive_festival_settings(archived_year);