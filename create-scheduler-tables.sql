-- Create tables for scheduler enhancements

-- Drop existing venue_template table if it exists to recreate with correct schema
DROP TABLE IF EXISTS venue_template;

-- Venue template table
CREATE TABLE venue_template (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_order JSONB NOT NULL, -- Array of {venue: string, house: string} objects
    program_colors JSONB DEFAULT '{}', -- Object mapping program names to colors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Venue blackouts table
CREATE TABLE IF NOT EXISTS venue_blackouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_house_id UUID NOT NULL REFERENCES venue_houses(id) ON DELETE CASCADE,
    blackout_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add press_industry field to film_screenings if it doesn't exist
ALTER TABLE film_screenings 
ADD COLUMN IF NOT EXISTS press_industry BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE venue_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_blackouts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated users to read venue template" ON venue_template
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage venue template" ON venue_template
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read venue blackouts" ON venue_blackouts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage venue blackouts" ON venue_blackouts
    FOR ALL TO authenticated USING (true);

-- Update timestamps triggers
CREATE TRIGGER update_venue_template_updated_at BEFORE UPDATE ON venue_template
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_blackouts_updated_at BEFORE UPDATE ON venue_blackouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_venue_blackouts_venue_date ON venue_blackouts(venue_house_id, blackout_date);
CREATE INDEX idx_venue_blackouts_date ON venue_blackouts(blackout_date);

COMMIT;