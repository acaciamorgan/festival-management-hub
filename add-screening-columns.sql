-- Add screening columns to programming_films table

-- Add new columns for screening information
ALTER TABLE programming_films 
ADD COLUMN day TEXT,
ADD COLUMN date TEXT, 
ADD COLUMN location TEXT,
ADD COLUMN start_time TEXT;

-- Create a separate table for multiple screenings per film
CREATE TABLE programming_film_public_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    programming_film_id UUID NOT NULL REFERENCES programming_films(id) ON DELETE CASCADE,
    day TEXT NOT NULL, -- Wednesday, Thursday, etc.
    date TEXT NOT NULL, -- Oct. 16, Oct. 17, etc.
    location TEXT NOT NULL, -- MBT, AMC 1, etc.
    start_time TEXT NOT NULL, -- 6:30 PM, 10:00 PM, etc.
    running_time INTEGER, -- minutes from Schedule CSV
    capacity INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE programming_film_public_screenings ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow authenticated users to manage programming film public screenings" 
ON programming_film_public_screenings FOR ALL TO authenticated USING (true);

-- Index for performance
CREATE INDEX idx_programming_film_public_screenings_film ON programming_film_public_screenings(programming_film_id);
CREATE INDEX idx_programming_film_public_screenings_date ON programming_film_public_screenings(date);
CREATE INDEX idx_programming_film_public_screenings_location ON programming_film_public_screenings(location);

-- Update trigger
CREATE TRIGGER update_programming_film_public_screenings_updated_at 
BEFORE UPDATE ON programming_film_public_screenings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;