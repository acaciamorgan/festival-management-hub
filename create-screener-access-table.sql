-- Create screener_access table for tracking film screener availability
CREATE TABLE IF NOT EXISTS screener_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  film_id uuid NOT NULL,
  access_type text CHECK (access_type IN ('tbd', 'cinesend', 'link_available', 'request_link', 'no_links')) DEFAULT 'tbd',
  cinesend_instructions_sent boolean DEFAULT false,
  cinesend_uploaded boolean DEFAULT false,
  link_url text,
  link_password text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policy
ALTER TABLE screener_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON screener_access
FOR ALL USING (auth.role() = 'authenticated');

-- Add unique constraint to prevent duplicate entries per film
CREATE UNIQUE INDEX IF NOT EXISTS screener_access_film_id_unique ON screener_access(film_id);

-- Add foreign key constraint (optional, depending on your setup)
-- ALTER TABLE screener_access ADD CONSTRAINT fk_film_id FOREIGN KEY (film_id) REFERENCES feature_films(id) ON DELETE CASCADE;