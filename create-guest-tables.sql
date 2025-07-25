-- Create guest tables for Guest Cards and In Attendance Module
-- Run this in your Supabase SQL Editor

-- Guest Cards table
CREATE TABLE IF NOT EXISTS guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT, -- citizenship country
    guest_type TEXT CHECK (guest_type IN ('Features', 'Shorts', 'Industry', 'CineYouth', 'Jury', 'Other')),
    confirmed BOOLEAN DEFAULT FALSE,
    role TEXT, -- auto-filled from film cards or manually entered
    
    -- Contact Information
    contact_name TEXT,
    contact_email TEXT,
    
    -- Travel Details
    arranging_travel TEXT CHECK (arranging_travel IN ('Festival', 'Distributor', 'Local', 'TBD')) DEFAULT 'TBD',
    
    -- Arrival Flight Info
    arrival_date DATE,
    arrival_takeoff_time TIME,
    arrival_landing_time TIME,
    arrival_airline TEXT,
    arrival_flight_number TEXT,
    arrival_origin TEXT,
    arrival_destination TEXT,
    
    -- Departure Flight Info
    departure_date DATE,
    departure_takeoff_time TIME,
    departure_landing_time TIME,
    departure_airline TEXT,
    departure_flight_number TEXT,
    departure_origin TEXT,
    departure_destination TEXT,
    
    -- Hotel Information
    hotel_name TEXT,
    hotel_address TEXT,
    hotel_confirmation_number TEXT,
    
    -- Festival Management
    checked_in BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Guest-Film relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS guest_films (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    film_id UUID REFERENCES feature_films(id) ON DELETE CASCADE,
    film_title TEXT NOT NULL, -- stored for quick access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest-Program relationship table (for future)
CREATE TABLE IF NOT EXISTS guest_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    program_id UUID, -- will reference programs table when built
    program_title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);
CREATE INDEX IF NOT EXISTS idx_guests_guest_type ON guests(guest_type);
CREATE INDEX IF NOT EXISTS idx_guests_confirmed ON guests(confirmed);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON guests(checked_in);
CREATE INDEX IF NOT EXISTS idx_guests_arrival_date ON guests(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guests_departure_date ON guests(departure_date);
CREATE INDEX IF NOT EXISTS idx_guest_films_guest_id ON guest_films(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_films_film_id ON guest_films(film_id);
CREATE INDEX IF NOT EXISTS idx_guest_programs_guest_id ON guest_programs(guest_id);

-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_programs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development)
CREATE POLICY "Enable all operations for all users on guests" ON guests FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on guest_films" ON guest_films FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on guest_programs" ON guest_programs FOR ALL USING (true);