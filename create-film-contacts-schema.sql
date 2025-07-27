-- Film Contacts Schema
-- Add contact information for feature and short films

-- Create film contacts table
CREATE TABLE film_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (film_type IN ('feature', 'short')),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('Distributor/Studio', 'Production Team', 'Publicity', 'Other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX idx_film_contacts_film_id ON film_contacts(film_id);
CREATE INDEX idx_film_contacts_film_type ON film_contacts(film_type);
CREATE INDEX idx_film_contacts_name ON film_contacts(name);

-- Add updated_at trigger
CREATE TRIGGER update_film_contacts_updated_at
  BEFORE UPDATE ON film_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE film_contacts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all film contacts
CREATE POLICY "Film contacts are viewable by authenticated users"
  ON film_contacts FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert film contacts
CREATE POLICY "Film contacts are insertable by authenticated users"
  ON film_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update film contacts
CREATE POLICY "Film contacts are updatable by authenticated users"
  ON film_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete film contacts
CREATE POLICY "Film contacts are deletable by authenticated users"
  ON film_contacts FOR DELETE
  TO authenticated
  USING (true);