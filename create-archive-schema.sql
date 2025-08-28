-- Festival Archives Database Schema
-- Creates archive tables for all festival data with festival_year tracking

-- Meta table for festival years
CREATE TABLE IF NOT EXISTS festival_years (
  year INTEGER PRIMARY KEY,
  edition TEXT, -- "60th", "61st", etc.
  festival_name TEXT, -- "60th Annual Film Festival"
  start_date DATE,
  end_date DATE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Archive: Feature Films
CREATE TABLE IF NOT EXISTS archived_feature_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID, -- reference to original record
  festival_year INTEGER REFERENCES festival_years(year),
  
  -- Film details
  title TEXT NOT NULL,
  director TEXT,
  producer TEXT,
  year INTEGER,
  runtime INTEGER,
  countries TEXT,
  language TEXT,
  color_or_bw TEXT,
  synopsis TEXT,
  submission_id TEXT,
  program_designation TEXT, -- "Opening Night", "Closing Night", etc.
  
  -- Technical details
  aspect_ratio TEXT,
  sound_format TEXT,
  film_format TEXT,
  source_format TEXT,
  screening_format TEXT,
  subtitles TEXT,
  subtitles_format TEXT,
  
  -- Metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Short Films  
CREATE TABLE IF NOT EXISTS archived_short_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  -- Film details
  title TEXT NOT NULL,
  director TEXT,
  producer TEXT,
  year INTEGER,
  runtime INTEGER,
  countries TEXT,
  language TEXT,
  color_or_bw TEXT,
  synopsis TEXT,
  shorts_program_name TEXT,
  
  -- Technical details
  aspect_ratio TEXT,
  sound_format TEXT,
  film_format TEXT,
  source_format TEXT,
  screening_format TEXT,
  subtitles TEXT,
  
  -- Metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Programs
CREATE TABLE IF NOT EXISTS archived_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  title TEXT NOT NULL,
  description TEXT,
  program_type TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Press Management
CREATE TABLE IF NOT EXISTS archived_press (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  name TEXT NOT NULL,
  media_outlet TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  twitter TEXT,
  instagram TEXT,
  bio TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Press Screenings
CREATE TABLE IF NOT EXISTS archived_press_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_title TEXT NOT NULL,
  screening_date DATE,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  capacity INTEGER,
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Screener Access
CREATE TABLE IF NOT EXISTS archived_screener_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_id UUID,
  film_title TEXT,
  access_type TEXT, -- 'link_available', 'request_link', 'no_links'
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Press Requests
CREATE TABLE IF NOT EXISTS archived_press_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  requester_name TEXT NOT NULL,
  requester_outlet TEXT,
  requester_email TEXT,
  request_type TEXT, -- 'screener_link', 'screening_ticket'
  film_titles TEXT,
  screening_id TEXT,
  screening_type TEXT,
  screening_date DATE,
  screening_time TIME,
  venue_short_code TEXT,
  status TEXT, -- 'new', 'requested', 'fulfilled'
  requested_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Photo Shoots
CREATE TABLE IF NOT EXISTS archived_photo_shoots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_title TEXT,
  talent_names TEXT,
  photographer TEXT,
  shoot_date DATE,
  shoot_time TIME,
  location TEXT,
  duration_minutes INTEGER,
  contact_info TEXT,
  special_requests TEXT,
  status TEXT,
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: In Attendance
CREATE TABLE IF NOT EXISTS archived_in_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  name TEXT NOT NULL,
  film_association TEXT,
  role TEXT, -- "Director", "Producer", "Actor", etc.
  arrival_date DATE,
  departure_date DATE,
  accommodation TEXT,
  contact_email TEXT,
  phone TEXT,
  special_requirements TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Red Carpets
CREATE TABLE IF NOT EXISTS archived_red_carpets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  event_name TEXT,
  film_title TEXT,
  event_date DATE,
  event_time TIME,
  venue TEXT,
  talent_names TEXT,
  photographers TEXT,
  media_contacts TEXT,
  setup_time TIME,
  duration_minutes INTEGER,
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Special Events
CREATE TABLE IF NOT EXISTS archived_special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  capacity INTEGER,
  description TEXT,
  organizer TEXT,
  contact_info TEXT,
  budget DECIMAL(10,2),
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Ticketing (Published Screenings)
CREATE TABLE IF NOT EXISTS archived_published_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_title TEXT NOT NULL,
  screening_date DATE,
  start_time TIME,
  venue_short_code TEXT,
  run_time INTEGER,
  capacity INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  ticket_price DECIMAL(8,2),
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: P&I/Jury Screenings
CREATE TABLE IF NOT EXISTS archived_pi_jury_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_title TEXT NOT NULL,
  screening_date DATE,
  start_time TIME,
  venue_short_code TEXT,
  run_time INTEGER,
  capacity INTEGER,
  screening_type TEXT, -- 'pi_jury'
  notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Tech Check Screenings
CREATE TABLE IF NOT EXISTS archived_tech_check_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_title TEXT NOT NULL,
  screening_date DATE,
  start_time TIME,
  venue_short_code TEXT,
  run_time INTEGER,
  capacity INTEGER,
  tech_notes TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Film Contacts
CREATE TABLE IF NOT EXISTS archived_film_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  film_id UUID,
  film_title TEXT,
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive: Venues
CREATE TABLE IF NOT EXISTS archived_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  festival_year INTEGER REFERENCES festival_years(year),
  
  venue_name TEXT NOT NULL,
  short_code TEXT,
  address TEXT,
  capacity INTEGER,
  contact_person TEXT,
  contact_phone TEXT,
  technical_specs TEXT,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common archive queries
CREATE INDEX IF NOT EXISTS idx_archived_feature_films_year ON archived_feature_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_feature_films_director ON archived_feature_films(director);
CREATE INDEX IF NOT EXISTS idx_archived_short_films_year ON archived_short_films(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_press_year ON archived_press(festival_year);
CREATE INDEX IF NOT EXISTS idx_archived_press_requests_year ON archived_press_requests(festival_year);
CREATE INDEX IF NOT EXISTS idx_festival_years_year ON festival_years(year);

-- Enable RLS on archive tables
ALTER TABLE festival_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_feature_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_short_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_press ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_press_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_screener_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_press_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_photo_shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_in_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_red_carpets ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_published_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_pi_jury_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_tech_check_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_film_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can view all archived data)
CREATE POLICY "Users can view all archived data" ON festival_years FOR SELECT USING (true);
CREATE POLICY "Users can view archived feature films" ON archived_feature_films FOR SELECT USING (true);
CREATE POLICY "Users can view archived short films" ON archived_short_films FOR SELECT USING (true);
CREATE POLICY "Users can view archived programs" ON archived_programs FOR SELECT USING (true);
CREATE POLICY "Users can view archived press" ON archived_press FOR SELECT USING (true);
CREATE POLICY "Users can view archived press screenings" ON archived_press_screenings FOR SELECT USING (true);
CREATE POLICY "Users can view archived screener access" ON archived_screener_access FOR SELECT USING (true);
CREATE POLICY "Users can view archived press requests" ON archived_press_requests FOR SELECT USING (true);
CREATE POLICY "Users can view archived photo shoots" ON archived_photo_shoots FOR SELECT USING (true);
CREATE POLICY "Users can view archived in attendance" ON archived_in_attendance FOR SELECT USING (true);
CREATE POLICY "Users can view archived red carpets" ON archived_red_carpets FOR SELECT USING (true);
CREATE POLICY "Users can view archived special events" ON archived_special_events FOR SELECT USING (true);
CREATE POLICY "Users can view archived published screenings" ON archived_published_screenings FOR SELECT USING (true);
CREATE POLICY "Users can view archived pi jury screenings" ON archived_pi_jury_screenings FOR SELECT USING (true);
CREATE POLICY "Users can view archived tech check screenings" ON archived_tech_check_screenings FOR SELECT USING (true);
CREATE POLICY "Users can view archived film contacts" ON archived_film_contacts FOR SELECT USING (true);
CREATE POLICY "Users can view archived venues" ON archived_venues FOR SELECT USING (true);

-- Admin policies for archiving (insert only)
CREATE POLICY "Admins can insert archive data" ON festival_years FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived feature films" ON archived_feature_films FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived short films" ON archived_short_films FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived programs" ON archived_programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived press" ON archived_press FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived press screenings" ON archived_press_screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived screener access" ON archived_screener_access FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived press requests" ON archived_press_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived photo shoots" ON archived_photo_shoots FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived in attendance" ON archived_in_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived red carpets" ON archived_red_carpets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived special events" ON archived_special_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived published screenings" ON archived_published_screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived pi jury screenings" ON archived_pi_jury_screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived tech check screenings" ON archived_tech_check_screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived film contacts" ON archived_film_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can insert archived venues" ON archived_venues FOR INSERT WITH CHECK (true);