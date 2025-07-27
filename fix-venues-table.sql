-- Fix venues table to match the expected schema
-- Add missing columns
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_names TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_emails TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phones TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update venue_type column to have proper constraint
UPDATE venues SET venue_type = 'Restaurant' WHERE venue_type IS NULL;
ALTER TABLE venues ALTER COLUMN venue_type SET NOT NULL;
ALTER TABLE venues ADD CONSTRAINT venue_type_check CHECK (venue_type IN ('Movie Theater', 'Restaurant', 'Event Space'));