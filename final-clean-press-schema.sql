-- Final clean up of press table - remove unwanted columns
-- Run this AFTER wiping the data

-- Add outlet_type if it doesn't exist
ALTER TABLE press ADD COLUMN IF NOT EXISTS outlet_type TEXT;

-- Remove unwanted columns
ALTER TABLE press DROP COLUMN IF EXISTS preferred_contact_method;
ALTER TABLE press DROP COLUMN IF EXISTS special_requirements;
ALTER TABLE press DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE press DROP COLUMN IF EXISTS credential_status;
ALTER TABLE press DROP COLUMN IF EXISTS mailing_address;
ALTER TABLE press DROP COLUMN IF EXISTS mailing_address_2;
ALTER TABLE press DROP COLUMN IF EXISTS city;
ALTER TABLE press DROP COLUMN IF EXISTS state;
ALTER TABLE press DROP COLUMN IF EXISTS country;
ALTER TABLE press DROP COLUMN IF EXISTS zip_code;
ALTER TABLE press DROP COLUMN IF EXISTS office_phone;
ALTER TABLE press DROP COLUMN IF EXISTS first_time_applicant;
ALTER TABLE press DROP COLUMN IF EXISTS coverage_method;
ALTER TABLE press DROP COLUMN IF EXISTS critics_org_member;
ALTER TABLE press DROP COLUMN IF EXISTS outlet_country;
ALTER TABLE press DROP COLUMN IF EXISTS market_region;
ALTER TABLE press DROP COLUMN IF EXISTS circulation;
ALTER TABLE press DROP COLUMN IF EXISTS editor_first_name;
ALTER TABLE press DROP COLUMN IF EXISTS editor_last_name;
ALTER TABLE press DROP COLUMN IF EXISTS editor_email;

-- Verify final clean schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'press' 
ORDER BY column_name;