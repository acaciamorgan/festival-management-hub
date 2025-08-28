-- Add missing archive tables for complete export functionality

-- Archived Press Screenings
CREATE TABLE IF NOT EXISTS archived_press_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    film_title TEXT,
    screening_date DATE,
    start_time TIME,
    end_time TIME,
    venue TEXT,
    capacity INTEGER,
    notes TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived Screener Access
CREATE TABLE IF NOT EXISTS archived_screener_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    film_id UUID,
    access_type TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived Photo Shoots
CREATE TABLE IF NOT EXISTS archived_photo_shoots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    film_title TEXT,
    talent_names TEXT,
    photographer TEXT,
    shoot_date DATE,
    shoot_time TIME,
    location TEXT,
    duration_minutes INTEGER,
    status TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived In Attendance
CREATE TABLE IF NOT EXISTS archived_in_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    name TEXT,
    film_association TEXT,
    role TEXT,
    arrival_date DATE,
    departure_date DATE,
    accommodation TEXT,
    contact_email TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived Red Carpets
CREATE TABLE IF NOT EXISTS archived_red_carpets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    event_name TEXT,
    film_title TEXT,
    event_date DATE,
    event_time TIME,
    venue TEXT,
    talent_names TEXT,
    photographers TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived Special Events
CREATE TABLE IF NOT EXISTS archived_special_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    festival_year INTEGER NOT NULL,
    event_name TEXT,
    event_type TEXT,
    event_date DATE,
    start_time TIME,
    end_time TIME,
    venue TEXT,
    capacity INTEGER,
    description TEXT,
    organizer TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_press_screenings_festival_year ON archived_press_screenings(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_screener_access_festival_year ON archived_screener_access(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_photo_shoots_festival_year ON archived_photo_shoots(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_in_attendance_festival_year ON archived_in_attendance(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_red_carpets_festival_year ON archived_red_carpets(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_special_events_festival_year ON archived_special_events(festival_year);

-- Enable RLS
ALTER TABLE archived_press_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_screener_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_photo_shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_in_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_red_carpets ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_special_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for all users on archived_press_screenings" ON archived_press_screenings FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on archived_screener_access" ON archived_screener_access FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on archived_photo_shoots" ON archived_photo_shoots FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on archived_in_attendance" ON archived_in_attendance FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on archived_red_carpets" ON archived_red_carpets FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users on archived_special_events" ON archived_special_events FOR ALL USING (true);