-- Add missing contact columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_names TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_emails TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phones TEXT[];