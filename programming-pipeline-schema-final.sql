-- Programming Pipeline Schema - Final Version
-- Removes all publish functionality, keeps as isolated sketchbox

-- Drop existing tables if they exist to recreate with correct structure
DROP TABLE IF EXISTS programming_film_contacts CASCADE;
DROP TABLE IF EXISTS programming_films CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Main contacts table - isolated to programming pipeline
CREATE TABLE contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_company TEXT, -- matches "Contact Company" 
    contact_name TEXT NOT NULL, -- matches "Contact Name"
    contact_email TEXT, -- matches "Contact email"
    phone TEXT,
    notes TEXT,
    contact_type TEXT, -- distributor, sales_agent, filmmaker, producer, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Programming films table - matches CSV structure exactly, no publish integration
CREATE TABLE programming_films (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic film info (matches CSV columns)
    film TEXT NOT NULL, -- matches "Film" column
    original_title TEXT, -- matches "Original Title"
    director TEXT, -- matches "Director"
    country TEXT, -- matches "Country"
    category TEXT, -- matches "Category"
    runtime INTEGER, -- minutes
    
    -- Programming workflow fields (matches CSV exactly)
    travel TEXT, -- matches "Travel" 
    synopsis TEXT, -- matches "Synopsis" (writer name)
    written BOOLEAN DEFAULT FALSE, -- matches "Written" (X = true)
    approved TEXT, -- matches "Approved" (Logline, X, etc.)
    content_consideration TEXT, -- matches "Content Consideration"
    
    -- Program assignments (matches CSV) - up to 5 programs
    program TEXT, -- matches "Program"
    program_2 TEXT, -- matches "Program 2"
    program_3 TEXT, -- matches "Program 3"
    program_4 TEXT, -- matches "Program 4"
    program_5 TEXT, -- matches "Program 5"
    
    -- Materials and submission tracking (matches CSV)
    contacted_for_materials BOOLEAN DEFAULT FALSE, -- matches "Contacted for materials"
    form_submitted BOOLEAN DEFAULT FALSE, -- matches "Form Submitted"
    uploaded_materials BOOLEAN DEFAULT FALSE, -- matches "Uploaded Materials"
    materials_received BOOLEAN DEFAULT FALSE, -- matches "Materials Received"
    accessibility_screening BOOLEAN DEFAULT FALSE, -- matches "Accessibility Screening?"
    premiere_status TEXT, -- matches "Premiere Status"
    cards_made BOOLEAN DEFAULT FALSE, -- matches "Cards made"
    
    -- Visual and metadata - NO PUBLISH FUNCTIONALITY
    color_highlight TEXT, -- hex color for row highlighting
    cell_highlights JSONB DEFAULT '{}', -- individual cell highlighting
    programming_notes TEXT,
    status TEXT DEFAULT 'draft', -- only draft status, no publishing
    
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

-- Venues and scheduling tables for the Scheduling Planner
CREATE TABLE IF NOT EXISTS venues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    capacity INTEGER,
    technical_specs TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS venue_houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- House 1, Screen A, etc.
    capacity INTEGER,
    technical_specs TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Scheduling table for the drag-and-drop calendar
CREATE TABLE IF NOT EXISTS film_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    programming_film_id UUID NOT NULL REFERENCES programming_films(id) ON DELETE CASCADE,
    venue_house_id UUID NOT NULL REFERENCES venue_houses(id) ON DELETE CASCADE,
    screening_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL, -- calculated from start_time + runtime + buffer
    buffer_minutes INTEGER DEFAULT 30, -- cleanup/setup time
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent overlapping screenings in same venue
    EXCLUDE USING gist (
        venue_house_id WITH =,
        tsrange(
            (screening_date + start_time)::timestamp,
            (screening_date + end_time)::timestamp,
            '[)'
        ) WITH &&
    )
);

-- Indexes for performance
CREATE INDEX idx_contacts_company ON contacts(contact_company);
CREATE INDEX idx_contacts_name ON contacts(contact_name);
CREATE INDEX idx_contacts_email ON contacts(contact_email);
CREATE INDEX idx_programming_films_title ON programming_films(film);
CREATE INDEX idx_programming_films_status ON programming_films(status);
CREATE INDEX idx_programming_films_category ON programming_films(category);
CREATE INDEX idx_programming_films_program ON programming_films(program);
CREATE INDEX idx_programming_films_cell_highlights ON programming_films USING GIN (cell_highlights);
CREATE INDEX idx_programming_film_contacts_film ON programming_film_contacts(programming_film_id);
CREATE INDEX idx_programming_film_contacts_contact ON programming_film_contacts(contact_id);
CREATE INDEX idx_film_screenings_date ON film_screenings(screening_date);
CREATE INDEX idx_film_screenings_venue ON film_screenings(venue_house_id);

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

-- Insert some default venues for testing (only if they don't exist)
INSERT INTO venues (name, capacity) 
SELECT 'Music Box Theatre', 750
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Music Box Theatre');

INSERT INTO venues (name, capacity) 
SELECT 'Logan Theatre', 350
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Logan Theatre');

INSERT INTO venues (name, capacity) 
SELECT 'Gene Siskel Film Center', 180
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Gene Siskel Film Center');

INSERT INTO venue_houses (venue_id, name, capacity) 
SELECT v.id, 'Main Theatre', 750
FROM venues v WHERE v.name = 'Music Box Theatre'
AND NOT EXISTS (SELECT 1 FROM venue_houses vh WHERE vh.name = 'Main Theatre');

INSERT INTO venue_houses (venue_id, name, capacity) 
SELECT v.id, 'Theater 1', 200
FROM venues v WHERE v.name = 'Logan Theatre'
AND NOT EXISTS (SELECT 1 FROM venue_houses vh WHERE vh.name = 'Theater 1' AND vh.venue_id = v.id);

INSERT INTO venue_houses (venue_id, name, capacity) 
SELECT v.id, 'Theater 2', 150
FROM venues v WHERE v.name = 'Logan Theatre'
AND NOT EXISTS (SELECT 1 FROM venue_houses vh WHERE vh.name = 'Theater 2' AND vh.venue_id = v.id);

INSERT INTO venue_houses (venue_id, name, capacity) 
SELECT v.id, 'Theater 1', 180
FROM venues v WHERE v.name = 'Gene Siskel Film Center'
AND NOT EXISTS (SELECT 1 FROM venue_houses vh WHERE vh.name = 'Theater 1' AND vh.venue_id = v.id);

COMMIT;