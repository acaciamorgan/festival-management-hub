-- Fix contacts table schema to match application expectations
ALTER TABLE contacts 
  RENAME COLUMN name TO contact_name;

ALTER TABLE contacts 
  RENAME COLUMN company TO contact_company;

ALTER TABLE contacts 
  RENAME COLUMN email TO contact_email;

ALTER TABLE contacts 
  RENAME COLUMN category TO contact_type;

-- Add missing fields if they don't exist
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Add foreign key relationship to film_contacts table
ALTER TABLE film_contacts 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_film_contacts_contact_id ON film_contacts(contact_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
ORDER BY ordinal_position;