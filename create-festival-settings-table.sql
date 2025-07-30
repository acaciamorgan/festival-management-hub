-- Create festival_settings table
CREATE TABLE IF NOT EXISTS festival_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_number INTEGER NOT NULL,
  festival_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  important_links JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data for 60th Chicago International Film Festival
INSERT INTO festival_settings (edition_number, festival_name, start_date, end_date, important_links)
SELECT 60,
       'Chicago International Film Festival',
       '2024-10-16',
       '2024-10-27',
       '[
         {"title": "Festival Website", "url": "https://chicagofilmfestival.com"},
         {"title": "Box Office System", "url": "#"},
         {"title": "Press Portal", "url": "#"}
       ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM festival_settings LIMIT 1);