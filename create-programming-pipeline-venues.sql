-- Programming Pipeline Isolated Venue System
-- Completely separate from the main venue management system

-- Enable required extensions for GIST exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop existing references to external venue system
DROP TABLE IF EXISTS venue_blackouts CASCADE;
DROP TABLE IF EXISTS venue_template CASCADE;
DROP TABLE IF EXISTS film_screenings CASCADE;

-- Create Programming Pipeline specific venue houses
-- These are completely isolated and have no relationship to the main venues system
CREATE TABLE programming_venue_houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_name TEXT NOT NULL, -- e.g., "Music Box Theatre"
    house_name TEXT NOT NULL, -- e.g., "Theater 1"
    display_order INTEGER NOT NULL DEFAULT 0, -- for sorting in scheduler
    capacity INTEGER,
    technical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique venue+house combinations
    UNIQUE(venue_name, house_name)
);

-- Create Programming Pipeline specific film screenings
-- References only the programming-specific tables
CREATE TABLE programming_film_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    programming_film_id UUID NOT NULL REFERENCES programming_films(id) ON DELETE CASCADE,
    venue_house_id UUID NOT NULL REFERENCES programming_venue_houses(id) ON DELETE CASCADE,
    screening_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL, -- calculated from start_time + runtime + buffer
    buffer_minutes INTEGER DEFAULT 30, -- cleanup/setup time
    press_industry BOOLEAN DEFAULT FALSE, -- P&I checkbox
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Note: No database-level overlap prevention - conflicts shown visually only when requested
);

-- Create Programming Pipeline specific venue template
-- For custom ordering and program colors
CREATE TABLE programming_venue_template (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_order JSONB NOT NULL, -- Array of {venue: string, house: string} objects
    program_colors JSONB DEFAULT '{}', -- Object mapping program names to colors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Programming Pipeline specific venue blackouts
CREATE TABLE programming_venue_blackouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_house_id UUID NOT NULL REFERENCES programming_venue_houses(id) ON DELETE CASCADE,
    blackout_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Programming Pipeline specific festival settings
CREATE TABLE programming_festival_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default programming venue houses
INSERT INTO programming_venue_houses (venue_name, house_name, display_order, capacity)
VALUES 
    ('Music Box Theatre', 'Main Theater', 1, 750),
    ('Logan Theatre', 'Theater 1', 2, 200),
    ('Logan Theatre', 'Theater 2', 3, 150),
    ('Gene Siskel Film Center', 'Theater 1', 4, 180),
    ('Landmark Century Centre', 'Theater 1', 5, 400),
    ('Landmark Century Centre', 'Theater 2', 6, 300);

-- Insert default festival settings (Nov 15-26, 2025 as shown in screenshot)
INSERT INTO programming_festival_settings (start_date, end_date)
VALUES ('2025-10-15', '2025-10-26');

-- Create indexes for performance
CREATE INDEX idx_programming_venue_houses_order ON programming_venue_houses(display_order);
CREATE INDEX idx_programming_film_screenings_date ON programming_film_screenings(screening_date);
CREATE INDEX idx_programming_film_screenings_venue ON programming_film_screenings(venue_house_id);
CREATE INDEX idx_programming_film_screenings_film ON programming_film_screenings(programming_film_id);
CREATE INDEX idx_programming_venue_blackouts_venue_date ON programming_venue_blackouts(venue_house_id, blackout_date);

-- Enable RLS
ALTER TABLE programming_venue_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_film_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_venue_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_venue_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_festival_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for authenticated users)
CREATE POLICY "Allow authenticated users to read programming venue houses" ON programming_venue_houses
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage programming venue houses" ON programming_venue_houses
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read programming film screenings" ON programming_film_screenings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage programming film screenings" ON programming_film_screenings
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read programming venue template" ON programming_venue_template
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage programming venue template" ON programming_venue_template
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read programming venue blackouts" ON programming_venue_blackouts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage programming venue blackouts" ON programming_venue_blackouts
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read programming festival settings" ON programming_festival_settings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage programming festival settings" ON programming_festival_settings
    FOR ALL TO authenticated USING (true);

-- Update timestamps triggers
CREATE TRIGGER update_programming_venue_houses_updated_at BEFORE UPDATE ON programming_venue_houses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programming_film_screenings_updated_at BEFORE UPDATE ON programming_film_screenings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programming_venue_template_updated_at BEFORE UPDATE ON programming_venue_template
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programming_venue_blackouts_updated_at BEFORE UPDATE ON programming_venue_blackouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programming_festival_settings_updated_at BEFORE UPDATE ON programming_festival_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;