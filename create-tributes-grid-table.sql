-- Create tributes_grid table for Excel-like grid storage

CREATE TABLE IF NOT EXISTS tributes_grid (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    row_number INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique row/column combinations
    UNIQUE(row_number, column_number)
);

-- Enable RLS
ALTER TABLE tributes_grid ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Allow authenticated users to read tributes grid" ON tributes_grid
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage tributes grid" ON tributes_grid
    FOR ALL TO authenticated USING (true);

-- Update timestamps trigger
CREATE TRIGGER update_tributes_grid_updated_at BEFORE UPDATE ON tributes_grid
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tributes_grid_row_col ON tributes_grid(row_number, column_number);

COMMIT;