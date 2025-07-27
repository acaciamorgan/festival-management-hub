-- Apply all programming pipeline schema updates

-- First, add the new program fields and cell highlights if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'program_4') THEN
        ALTER TABLE programming_films ADD COLUMN program_4 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'program_5') THEN
        ALTER TABLE programming_films ADD COLUMN program_5 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'cell_highlights') THEN
        ALTER TABLE programming_films ADD COLUMN cell_highlights JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create index for cell highlights for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_programming_films_cell_highlights ON programming_films USING GIN (cell_highlights);

-- Update any existing records to have empty cell_highlights
UPDATE programming_films SET cell_highlights = '{}' WHERE cell_highlights IS NULL;

-- Ensure all the CSV-structure fields exist with correct names
DO $$ 
BEGIN 
    -- Check if we're using old field names and need to migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'film_title') THEN
        -- Migrate from old structure to new CSV structure
        ALTER TABLE programming_films RENAME COLUMN film_title TO film;
        
        -- Add any missing CSV fields
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'written') THEN
            ALTER TABLE programming_films ADD COLUMN written BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'approved') THEN
            ALTER TABLE programming_films ADD COLUMN approved TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'content_consideration') THEN
            ALTER TABLE programming_films ADD COLUMN content_consideration TEXT;
        END IF;
        
        -- Rename travel fields to match CSV
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'travel_status') THEN
            ALTER TABLE programming_films RENAME COLUMN travel_status TO travel;
        END IF;
        
        -- Rename synopsis fields to match CSV  
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'synopsis_writer') THEN
            ALTER TABLE programming_films RENAME COLUMN synopsis_writer TO synopsis;
        END IF;
        
        -- Add tracking fields if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'contacted_for_materials') THEN
            ALTER TABLE programming_films ADD COLUMN contacted_for_materials BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'form_submitted') THEN
            ALTER TABLE programming_films ADD COLUMN form_submitted BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'uploaded_materials') THEN
            ALTER TABLE programming_films ADD COLUMN uploaded_materials BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'accessibility_screening') THEN
            ALTER TABLE programming_films ADD COLUMN accessibility_screening BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'premiere_status') THEN
            ALTER TABLE programming_films ADD COLUMN premiere_status TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programming_films' AND column_name = 'cards_made') THEN
            ALTER TABLE programming_films ADD COLUMN cards_made BOOLEAN DEFAULT FALSE;
        END IF;
        
    END IF;
END $$;

-- Ensure contact table has correct field names
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company') THEN
        ALTER TABLE contacts RENAME COLUMN company TO contact_company;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'email') THEN
        ALTER TABLE contacts RENAME COLUMN email TO contact_email;
    END IF;
END $$;

COMMIT;