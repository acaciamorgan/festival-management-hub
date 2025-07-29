-- Create new ticketing grid screenings table
-- This replaces any existing screening tables with a clean, simplified structure

DROP TABLE IF EXISTS ticketing_screenings CASCADE;

CREATE TABLE ticketing_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Film connection (connects to programming_films table)
    film_title TEXT NOT NULL, -- Exact title from Films Grid
    programming_film_id UUID REFERENCES programming_films(id) ON DELETE CASCADE,
    
    -- Screening details
    screening_date DATE NOT NULL,
    day_of_week TEXT NOT NULL, -- Auto-calculated day like "Wednesday"
    start_time TIME NOT NULL,
    run_time INTEGER, -- Runtime in minutes (can override Films Grid)
    
    -- Venue connection (connects to theater_houses via short_code)
    venue_short_code TEXT NOT NULL, -- e.g., "AMC 1", "AMC 4"
    capacity INTEGER, -- Auto-pulled from venue, but can be overridden
    
    -- Additional details
    notes TEXT,
    
    -- Status tracking
    is_cancelled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_ticketing_screenings_film_title ON ticketing_screenings(film_title);
CREATE INDEX idx_ticketing_screenings_programming_film_id ON ticketing_screenings(programming_film_id);
CREATE INDEX idx_ticketing_screenings_date ON ticketing_screenings(screening_date);
CREATE INDEX idx_ticketing_screenings_venue_code ON ticketing_screenings(venue_short_code);
CREATE INDEX idx_ticketing_screenings_cancelled ON ticketing_screenings(is_cancelled);

-- Enable RLS
ALTER TABLE ticketing_screenings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development)
CREATE POLICY "Enable all operations for all users on ticketing_screenings" ON ticketing_screenings FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE ticketing_screenings IS 'Simplified ticketing/scheduling grid for festival screenings';
COMMENT ON COLUMN ticketing_screenings.film_title IS 'Exact title from Films Grid for display and matching';
COMMENT ON COLUMN ticketing_screenings.programming_film_id IS 'Foreign key to programming_films table';
COMMENT ON COLUMN ticketing_screenings.day_of_week IS 'Auto-calculated day name like "Wednesday"';
COMMENT ON COLUMN ticketing_screenings.venue_short_code IS 'Theater house short code like "AMC 1" from venues system';
COMMENT ON COLUMN ticketing_screenings.run_time IS 'Runtime in minutes, can override Films Grid value';
COMMENT ON COLUMN ticketing_screenings.capacity IS 'Screening capacity, auto-pulled from venue but can be overridden';
COMMENT ON COLUMN ticketing_screenings.is_cancelled IS 'When true, screening shows with strikethrough and red background';