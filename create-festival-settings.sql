-- Create festival_settings table for persistent festival configuration
CREATE TABLE IF NOT EXISTS festival_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE festival_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Everyone can view festival settings" ON festival_settings
    FOR SELECT USING (true);

-- Allow all authenticated users to insert/update settings
CREATE POLICY "Everyone can manage festival settings" ON festival_settings
    FOR ALL USING (true);

-- Insert default values if none exist
INSERT INTO festival_settings (start_date, end_date)
SELECT '2025-10-15'::date, '2025-10-26'::date
WHERE NOT EXISTS (SELECT 1 FROM festival_settings);