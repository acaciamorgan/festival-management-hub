-- Fix screener_access constraint to include 'tbd' as valid value
-- This ensures the constraint matches what the original schema intended

-- Drop the existing constraint
ALTER TABLE screener_access DROP CONSTRAINT IF EXISTS screener_access_access_type_check;

-- Add the correct constraint that includes 'tbd'
ALTER TABLE screener_access ADD CONSTRAINT screener_access_access_type_check 
  CHECK (access_type IN ('tbd', 'cinesend', 'link_available', 'request_link', 'no_links'));

-- Update the default value to 'tbd' if not already set
ALTER TABLE screener_access ALTER COLUMN access_type SET DEFAULT 'tbd';