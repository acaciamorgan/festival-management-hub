-- Add run_of_show_url column to red_carpets table
ALTER TABLE red_carpets ADD COLUMN IF NOT EXISTS run_of_show_url TEXT;
