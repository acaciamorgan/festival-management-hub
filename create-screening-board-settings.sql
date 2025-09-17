-- Create screening_board_settings table for storing global view settings
CREATE TABLE IF NOT EXISTS screening_board_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create a unique constraint to ensure only one settings row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_screening_board_single_row
ON screening_board_settings ((true));

-- Grant necessary permissions (no RLS)
GRANT ALL ON screening_board_settings TO authenticated;
GRANT ALL ON screening_board_settings TO anon;