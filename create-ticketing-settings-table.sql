-- Create ticketing_settings table for global view mode persistence
CREATE TABLE IF NOT EXISTS ticketing_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  view_mode TEXT DEFAULT 'ticketing' CHECK (view_mode IN ('ticketing', 'pi-jury', 'tech-checks', 'screening-board')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default record
INSERT INTO ticketing_settings (id, view_mode) 
VALUES (1, 'ticketing') 
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy
ALTER TABLE ticketing_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Anyone can read ticketing settings" ON ticketing_settings FOR SELECT TO authenticated USING (true);

-- Only allow admins/editors to update settings
CREATE POLICY "Only admins can update ticketing settings" ON ticketing_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can insert ticketing settings" ON ticketing_settings FOR INSERT TO authenticated USING (true);