-- Create junction table for many-to-many relationship between short_films and shorts_programs
CREATE TABLE IF NOT EXISTS short_film_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_film_id UUID NOT NULL REFERENCES short_films(id) ON DELETE CASCADE,
    shorts_program_id UUID NOT NULL REFERENCES shorts_programs(id) ON DELETE CASCADE,
    program_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(short_film_id, shorts_program_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_short_film_programs_film ON short_film_programs(short_film_id);
CREATE INDEX IF NOT EXISTS idx_short_film_programs_program ON short_film_programs(shorts_program_id);
CREATE INDEX IF NOT EXISTS idx_short_film_programs_order ON short_film_programs(shorts_program_id, program_order);

-- Migrate existing data from short_films.shorts_program_id to junction table
INSERT INTO short_film_programs (short_film_id, shorts_program_id, program_order)
SELECT 
    id as short_film_id,
    shorts_program_id,
    COALESCE(program_order, 0) as program_order
FROM short_films
WHERE shorts_program_id IS NOT NULL
ON CONFLICT (short_film_id, shorts_program_id) DO NOTHING;

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_short_film_programs_updated_at BEFORE UPDATE
    ON short_film_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS on the junction table (matching the pattern for shorts_programs)
ALTER TABLE short_film_programs DISABLE ROW LEVEL SECURITY;

-- Note: After running this migration and verifying the data:
-- 1. Update application code to use junction table
-- 2. Once confirmed working, run: ALTER TABLE short_films DROP COLUMN shorts_program_id, DROP COLUMN program_order;