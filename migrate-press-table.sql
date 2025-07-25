-- Migration to update press table for grouped secondary outlets
-- Run this in your Supabase SQL Editor

-- Add new columns for grouped secondary outlets
ALTER TABLE press ADD COLUMN IF NOT EXISTS secondary_outlets TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS secondary_outlet_urls TEXT;

-- Migrate existing data from separate columns to grouped columns (if any exists)
UPDATE press SET 
  secondary_outlets = CASE 
    WHEN secondary_outlet_1 IS NOT NULL OR secondary_outlet_2 IS NOT NULL OR secondary_outlet_3 IS NOT NULL OR secondary_outlet_4 IS NOT NULL THEN
      TRIM(BOTH ', ' FROM 
        COALESCE(secondary_outlet_1, '') ||
        CASE WHEN secondary_outlet_2 IS NOT NULL THEN ', ' || secondary_outlet_2 ELSE '' END ||
        CASE WHEN secondary_outlet_3 IS NOT NULL THEN ', ' || secondary_outlet_3 ELSE '' END ||
        CASE WHEN secondary_outlet_4 IS NOT NULL THEN ', ' || secondary_outlet_4 ELSE '' END
      )
    ELSE NULL
  END,
  secondary_outlet_urls = CASE 
    WHEN secondary_outlet_url_1 IS NOT NULL OR secondary_outlet_url_2 IS NOT NULL OR secondary_outlet_url_3 IS NOT NULL OR secondary_outlet_url_4 IS NOT NULL THEN
      TRIM(BOTH ', ' FROM 
        COALESCE(secondary_outlet_url_1, '') ||
        CASE WHEN secondary_outlet_url_2 IS NOT NULL THEN ', ' || secondary_outlet_url_2 ELSE '' END ||
        CASE WHEN secondary_outlet_url_3 IS NOT NULL THEN ', ' || secondary_outlet_url_3 ELSE '' END ||
        CASE WHEN secondary_outlet_url_4 IS NOT NULL THEN ', ' || secondary_outlet_url_4 ELSE '' END
      )
    ELSE NULL
  END
WHERE secondary_outlet_1 IS NOT NULL OR secondary_outlet_2 IS NOT NULL OR secondary_outlet_3 IS NOT NULL OR secondary_outlet_4 IS NOT NULL
   OR secondary_outlet_url_1 IS NOT NULL OR secondary_outlet_url_2 IS NOT NULL OR secondary_outlet_url_3 IS NOT NULL OR secondary_outlet_url_4 IS NOT NULL;

-- Drop old separate columns (uncomment these lines after verifying the migration worked)
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_1;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_2;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_3;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_4;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_url_1;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_url_2;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_url_3;
-- ALTER TABLE press DROP COLUMN IF EXISTS secondary_outlet_url_4;

-- Verify the migration
SELECT name, media_outlet, secondary_outlets, website_url, secondary_outlet_urls 
FROM press 
WHERE secondary_outlets IS NOT NULL OR secondary_outlet_urls IS NOT NULL
LIMIT 5;