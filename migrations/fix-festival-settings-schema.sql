-- Fix festival_settings schema to support both year-based archive system
-- AND preserve edition/name/links for each year
-- This corrects the mistake from add-multi-year-FINAL.sql

BEGIN;

-- Add missing columns to existing table (do NOT drop!)
ALTER TABLE festival_settings
  ADD COLUMN IF NOT EXISTS edition_number INTEGER,
  ADD COLUMN IF NOT EXISTS festival_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS important_links JSONB DEFAULT '[]';

-- Update the existing 2025 row with correct data
-- User provided: 61st edition, Oct 15-26, 2025
UPDATE festival_settings
SET
  edition_number = 61,
  festival_name = 'Chicago International Film Festival',
  start_date = '2025-10-15',
  end_date = '2025-10-26',
  important_links = '[]'::jsonb,  -- Empty array - user will re-enter the 12+ links via UI
  updated_at = NOW()
WHERE year = 2025;

-- Make critical columns NOT NULL (after populating data)
ALTER TABLE festival_settings
  ALTER COLUMN edition_number SET NOT NULL,
  ALTER COLUMN festival_name SET NOT NULL;

-- Verify final schema
COMMENT ON TABLE festival_settings IS 'Festival configuration per year - each year has its own row with edition, name, dates, and links';
COMMENT ON COLUMN festival_settings.year IS 'Festival year (unique) - used for filtering all other tables';
COMMENT ON COLUMN festival_settings.edition_number IS 'Edition number (e.g., 61 for 61st edition)';
COMMENT ON COLUMN festival_settings.festival_name IS 'Festival name (e.g., Chicago International Film Festival)';
COMMENT ON COLUMN festival_settings.important_links IS 'JSONB array of {title, url} objects for important links';
COMMENT ON COLUMN festival_settings.is_archived IS 'Whether this year is archived (read-only for non-admins)';

COMMIT;
