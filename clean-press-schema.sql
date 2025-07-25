-- Clean Press Table Schema - Only keep needed columns
-- Run this in your Supabase SQL Editor AFTER backing up any data you want to keep

-- First, let's see what we currently have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'press' 
ORDER BY column_name;

-- Add outlet_type column if it doesn't exist
ALTER TABLE press ADD COLUMN IF NOT EXISTS outlet_type TEXT;

-- Optional: Drop unwanted columns (uncomment these after confirming you want to remove them)
-- ALTER TABLE press DROP COLUMN IF EXISTS mailing_address;
-- ALTER TABLE press DROP COLUMN IF EXISTS mailing_address_2;
-- ALTER TABLE press DROP COLUMN IF EXISTS city;
-- ALTER TABLE press DROP COLUMN IF EXISTS state;
-- ALTER TABLE press DROP COLUMN IF EXISTS country;
-- ALTER TABLE press DROP COLUMN IF EXISTS zip_code;
-- ALTER TABLE press DROP COLUMN IF EXISTS office_phone;
-- ALTER TABLE press DROP COLUMN IF EXISTS first_time_applicant;
-- ALTER TABLE press DROP COLUMN IF EXISTS coverage_method;
-- ALTER TABLE press DROP COLUMN IF EXISTS critics_org_member;
-- ALTER TABLE press DROP COLUMN IF EXISTS outlet_country;
-- ALTER TABLE press DROP COLUMN IF EXISTS market_region;
-- ALTER TABLE press DROP COLUMN IF EXISTS circulation;
-- ALTER TABLE press DROP COLUMN IF EXISTS editor_first_name;
-- ALTER TABLE press DROP COLUMN IF EXISTS editor_last_name;
-- ALTER TABLE press DROP COLUMN IF EXISTS editor_email;

-- Verify final schema - should only have these columns:
-- id, name, email, phone, media_outlet, secondary_outlets, outlet_type, 
-- website_url, secondary_outlet_urls, social_media, rotten_tomatoes_accredited, 
-- critics_groups, accreditation_level, picked_up_credentials, preferred_contact_method, 
-- special_requirements, internal_notes, created_at, updated_at, created_by

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'press' 
ORDER BY column_name;