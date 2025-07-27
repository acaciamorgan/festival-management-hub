-- Programming Pipeline Schema - Fixed with single programs array
-- Removes all publish functionality, keeps as isolated sketchbox

-- Drop existing tables if they exist to recreate with correct structure
DROP TABLE IF EXISTS film_screenings CASCADE;
DROP TABLE IF EXISTS venue_houses CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
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
    
    -- Program assignments - stored as array like other modules
    programs TEXT[], -- array of program names, up to 5
    
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
CREATE TABLE venues (
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

CREATE TABLE venue_houses (
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

-- Scheduling table for the drag-and-drop calendar (simplified without complex constraint)
CREATE TABLE film_screenings (
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
    created_by UUID REFERENCES auth.users(id)
);

-- Create a unique index to prevent overlapping screenings (simpler approach)
CREATE UNIQUE INDEX idx_film_screenings_no_overlap 
ON film_screenings (venue_house_id, screening_date, start_time);

-- Indexes for performance
CREATE INDEX idx_contacts_company ON contacts(contact_company);
CREATE INDEX idx_contacts_name ON contacts(contact_name);
CREATE INDEX idx_contacts_email ON contacts(contact_email);
CREATE INDEX idx_programming_films_title ON programming_films(film);
CREATE INDEX idx_programming_films_status ON programming_films(status);
CREATE INDEX idx_programming_films_category ON programming_films(category);
CREATE INDEX idx_programming_films_programs ON programming_films USING GIN (programs);
CREATE INDEX idx_programming_films_cell_highlights ON programming_films USING GIN (cell_highlights);
CREATE INDEX idx_programming_film_contacts_film ON programming_film_contacts(programming_film_id);
CREATE INDEX idx_programming_film_contacts_contact ON programming_film_contacts(contact_id);
CREATE INDEX idx_film_screenings_date ON film_screenings(screening_date);
CREATE INDEX idx_film_screenings_venue ON film_screenings(venue_house_id);

-- Row Level Security (RLS) policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_film_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE film_screenings ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Allow authenticated users to read venues" ON venues
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage venues" ON venues
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read venue houses" ON venue_houses
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage venue houses" ON venue_houses
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read film screenings" ON film_screenings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage film screenings" ON film_screenings
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

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_houses_updated_at BEFORE UPDATE ON venue_houses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_film_screenings_updated_at BEFORE UPDATE ON film_screenings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default venues for testing
INSERT INTO venues (name, capacity) VALUES 
    ('Music Box Theatre', 750),
    ('Logan Theatre', 350),
    ('Gene Siskel Film Center', 180);

INSERT INTO venue_houses (venue_id, name, capacity) VALUES 
    ((SELECT id FROM venues WHERE name = 'Music Box Theatre'), 'Main Theatre', 750),
    ((SELECT id FROM venues WHERE name = 'Logan Theatre'), 'Theater 1', 200),
    ((SELECT id FROM venues WHERE name = 'Logan Theatre'), 'Theater 2', 150),
    ((SELECT id FROM venues WHERE name = 'Gene Siskel Film Center'), 'Theater 1', 180);

COMMIT;