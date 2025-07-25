-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    venue_type TEXT NOT NULL CHECK (venue_type IN ('Movie Theater', 'Restaurant', 'Event Space')),
    contact_names TEXT[],
    contact_emails TEXT[],
    contact_phones TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create theater_houses table
CREATE TABLE IF NOT EXISTS theater_houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    house_name TEXT NOT NULL,
    seat_count INTEGER NOT NULL CHECK (seat_count > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venues_venue_type ON venues(venue_type);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_theater_houses_venue_id ON theater_houses(venue_id);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE theater_houses ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development)
CREATE POLICY "Enable all operations for all users on venues" ON venues FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on theater_houses" ON theater_houses FOR ALL USING (true);