-- Sticky Notes Schema for Programming Pipeline
-- Add this to your Supabase SQL Editor

-- Create sticky_notes table
CREATE TABLE sticky_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Position and visual properties
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 150,
  color VARCHAR(20) DEFAULT 'yellow', -- yellow, blue, green, pink, etc.
  
  -- Content
  content TEXT,
  
  -- Module association
  module_id VARCHAR(50) NOT NULL DEFAULT 'programming-pipeline',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Optional: associate with specific films/rows (for future use)
  related_film_id UUID NULL
);

-- Create indexes for performance
CREATE INDEX idx_sticky_notes_module_id ON sticky_notes(module_id);
CREATE INDEX idx_sticky_notes_created_by ON sticky_notes(created_by);
CREATE INDEX idx_sticky_notes_film_id ON sticky_notes(related_film_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sticky_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER sticky_notes_updated_at_trigger
  BEFORE UPDATE ON sticky_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_sticky_notes_updated_at();

-- Add RLS policies (enable when ready for production)
-- ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view all sticky notes" ON sticky_notes FOR SELECT USING (true);
-- CREATE POLICY "Users can insert sticky notes" ON sticky_notes FOR INSERT WITH CHECK (auth.uid() = created_by);
-- CREATE POLICY "Users can update their own sticky notes" ON sticky_notes FOR UPDATE USING (auth.uid() = created_by);
-- CREATE POLICY "Users can delete their own sticky notes" ON sticky_notes FOR DELETE USING (auth.uid() = created_by);