-- Add missing fields to contacts table for the contacts grid

-- Add mailing address field
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Add cell highlights field for contact grid highlighting
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS cell_highlights JSONB DEFAULT '{}';

-- Add index for cell highlights
CREATE INDEX IF NOT EXISTS idx_contacts_cell_highlights ON contacts USING GIN (cell_highlights);

-- Update any existing contacts to have empty cell highlights
UPDATE contacts 
SET cell_highlights = '{}' 
WHERE cell_highlights IS NULL;