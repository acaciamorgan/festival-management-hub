-- Programming Pipeline Database Schema
-- Creates contacts database and programming films workflow

-- Main contacts table - shared across modules
CREATE TABLE contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    contact_type TEXT, -- distributor, sales_agent, filmmaker, producer, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Programming films table - pre-publication film data
CREATE TABLE programming_films (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    film_title TEXT NOT NULL,
    original_title TEXT,
    director TEXT,
    country TEXT,
    category TEXT, -- feature, short, etc.
    
    -- Programming workflow fields
    travel_status TEXT, -- Yes, No, Maybe, etc.
    travel_notes TEXT,
    synopsis_writer TEXT,
    synopsis_approved BOOLEAN DEFAULT FALSE,
    synopsis_notes TEXT,
    materials_received BOOLEAN DEFAULT FALSE,
    materials_notes TEXT,
    
    -- Visual and metadata
    color_highlight TEXT, -- hex color for row highlighting
    programming_notes TEXT,
    priority_level TEXT, -- high, medium, low
    
    -- Status tracking
    status TEXT DEFAULT 'draft', -- draft, ready_to_publish, published
    published_to_titles BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Junction table for many-to-many relationship between films and contacts
CREATE TABLE programming_film_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    programming_film_id UUID NOT NULL REFERENCES programming_films(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role TEXT, -- distributor, sales_agent, filmmaker, producer, etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique film-contact-role combinations
    UNIQUE(programming_film_id, contact_id, role)
);

-- Indexes for performance
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_name ON contacts(contact_name);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_programming_films_title ON programming_films(film_title);
CREATE INDEX idx_programming_films_status ON programming_films(status);
CREATE INDEX idx_programming_films_category ON programming_films(category);
CREATE INDEX idx_programming_film_contacts_film ON programming_film_contacts(programming_film_id);
CREATE INDEX idx_programming_film_contacts_contact ON programming_film_contacts(contact_id);

-- Row Level Security (RLS) policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_film_contacts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be refined later for permissions)
CREATE POLICY "Allow authenticated users to read contacts" ON contacts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage contacts" ON contacts
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read programming films" ON programming_films
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage programming films" ON programming_films
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read film contacts" ON programming_film_contacts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage film contacts" ON programming_film_contacts
    FOR ALL TO authenticated USING (true);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programming_films_updated_at BEFORE UPDATE ON programming_films
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();