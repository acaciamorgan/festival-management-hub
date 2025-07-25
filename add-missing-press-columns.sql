-- Add missing columns to press table
-- Run this in your Supabase SQL Editor

ALTER TABLE press ADD COLUMN IF NOT EXISTS office_phone TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS mailing_address_2 TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS first_time_applicant TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS coverage_method TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS critics_org_member TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS outlet_type TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS outlet_country TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS market_region TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS circulation TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS editor_first_name TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS editor_last_name TEXT;
ALTER TABLE press ADD COLUMN IF NOT EXISTS editor_email TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'press' 
ORDER BY column_name;