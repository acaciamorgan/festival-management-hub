-- Festival Management System - Production Schema Setup
-- This creates all tables and indexes needed for the festival management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Permissions Table (matches dev structure)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    module_permissions JSONB,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role_id UUID,
    custom_permissions BOOLEAN DEFAULT false,
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    user_phone TEXT
);

-- Feature Films Table
CREATE TABLE IF NOT EXISTS feature_films (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    director TEXT,
    producer TEXT,
    country TEXT,
    year INTEGER,
    genre TEXT,
    runtime INTEGER,
    synopsis TEXT,
    language TEXT,
    subtitles TEXT,
    world_premiere BOOLEAN DEFAULT false,
    us_premiere BOOLEAN DEFAULT false,
    regional_premiere BOOLEAN DEFAULT false,
    screening_format TEXT,
    aspect_ratio TEXT,
    sound_format TEXT,
    rating TEXT,
    distributor TEXT,
    sales_agent TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    submission_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shorts Programs Table
CREATE TABLE IF NOT EXISTS shorts_programs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_name TEXT NOT NULL,
    theme TEXT,
    description TEXT,
    total_runtime INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Short Films Table
CREATE TABLE IF NOT EXISTS short_films (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    director TEXT,
    producer TEXT,
    country TEXT,
    year INTEGER,
    genre TEXT,
    runtime INTEGER,
    synopsis TEXT,
    language TEXT,
    subtitles TEXT,
    world_premiere BOOLEAN DEFAULT false,
    us_premiere BOOLEAN DEFAULT false,
    regional_premiere BOOLEAN DEFAULT false,
    screening_format TEXT,
    aspect_ratio TEXT,
    sound_format TEXT,
    rating TEXT,
    distributor TEXT,
    sales_agent TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    submission_date DATE,
    shorts_program_id UUID REFERENCES shorts_programs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests Table
CREATE TABLE IF NOT EXISTS guests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    bio TEXT,
    headshot_url TEXT,
    website TEXT,
    social_media JSONB,
    dietary_restrictions TEXT,
    accommodation_needs TEXT,
    travel_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Press Table
CREATE TABLE IF NOT EXISTS press (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    outlet TEXT,
    email TEXT,
    phone TEXT,
    beat TEXT,
    bio TEXT,
    headshot_url TEXT,
    website TEXT,
    social_media JSONB,
    press_pass_status TEXT,
    accreditation_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venues Table
CREATE TABLE IF NOT EXISTS venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    capacity INTEGER,
    venue_type TEXT,
    amenities TEXT[],
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    title TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    film_title TEXT,
    film_id UUID REFERENCES feature_films(id),
    shorts_program_id UUID REFERENCES shorts_programs(id),
    journalist_name TEXT,
    press_id UUID REFERENCES press(id),
    outlet TEXT,
    email TEXT,
    subject_names TEXT,
    subject_guest_ids UUID[],
    status TEXT DEFAULT 'TBD',
    interview_date DATE,
    interview_time TIME,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Press Screenings Table
CREATE TABLE IF NOT EXISTS press_screenings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    film_id UUID REFERENCES feature_films(id),
    shorts_program_id UUID REFERENCES shorts_programs(id),
    screening_date DATE,
    screening_time TIME,
    venue_id UUID REFERENCES venues(id),
    venue_name TEXT,
    capacity INTEGER,
    rsvp_deadline DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screener Access Table
CREATE TABLE IF NOT EXISTS screener_access (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    film_title TEXT,
    film_id UUID REFERENCES feature_films(id),
    shorts_program_id UUID REFERENCES shorts_programs(id),
    journalist_name TEXT,
    press_id UUID REFERENCES press(id),
    outlet TEXT,
    email TEXT,
    access_level TEXT,
    password TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Press Requests Table
CREATE TABLE IF NOT EXISTS press_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    film_title TEXT,
    film_id UUID REFERENCES feature_films(id),
    shorts_program_id UUID REFERENCES shorts_programs(id),
    journalist_name TEXT,
    press_id UUID REFERENCES press(id),
    outlet TEXT,
    email TEXT,
    request_type TEXT,
    request_details TEXT,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Normal',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo Shoots Table
CREATE TABLE IF NOT EXISTS photo_shoots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    shoot_date DATE,
    shoot_time TIME,
    venue_id UUID REFERENCES venues(id),
    venue_name TEXT,
    photographer TEXT,
    guest_ids UUID[],
    guest_names TEXT,
    outfit_requirements TEXT,
    shot_list TEXT,
    notes TEXT,
    rsvp_deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- In Attendance Table
CREATE TABLE IF NOT EXISTS in_attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id),
    guest_name TEXT,
    arrival_date DATE,
    departure_date DATE,
    accommodation TEXT,
    transportation TEXT,
    special_needs TEXT,
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special Events Table
CREATE TABLE IF NOT EXISTS special_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    event_time TIME,
    venue_id UUID REFERENCES venues(id),
    venue_name TEXT,
    capacity INTEGER,
    guest_ids UUID[],
    guest_names TEXT,
    press_ids UUID[],
    press_names TEXT,
    dress_code TEXT,
    catering TEXT,
    rsvp_deadline DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Red Carpets Table
CREATE TABLE IF NOT EXISTS red_carpets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    event_date DATE,
    event_time TIME,
    venue_id UUID REFERENCES venues(id),
    venue_name TEXT,
    guest_ids UUID[],
    guest_names TEXT,
    press_ids UUID[],
    press_names TEXT,
    step_repeat_sponsors TEXT,
    photo_requirements TEXT,
    rsvp_deadline DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programming Pipeline Table
CREATE TABLE IF NOT EXISTS programming_pipeline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contact_name TEXT,
    contact_id UUID REFERENCES contacts(id),
    company TEXT,
    title TEXT,
    email TEXT,
    phone TEXT,
    project_title TEXT,
    project_type TEXT,
    genre TEXT,
    status TEXT DEFAULT 'Initial Contact',
    priority TEXT DEFAULT 'Normal',
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive Tables (2024)
CREATE TABLE IF NOT EXISTS archive_2024_feature_films (LIKE feature_films INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_shorts_programs (LIKE shorts_programs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_short_films (LIKE short_films INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_guests (LIKE guests INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_press (LIKE press INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_venues (LIKE venues INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_contacts (LIKE contacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_interviews (LIKE interviews INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_press_screenings (LIKE press_screenings INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_screener_access (LIKE screener_access INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_press_requests (LIKE press_requests INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_photo_shoots (LIKE photo_shoots INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_in_attendance (LIKE in_attendance INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_special_events (LIKE special_events INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_red_carpets (LIKE red_carpets INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archive_2024_programming_pipeline (LIKE programming_pipeline INCLUDING ALL);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_short_films_program_id ON short_films (shorts_program_id);
CREATE INDEX IF NOT EXISTS idx_interviews_film_id ON interviews (film_id);
CREATE INDEX IF NOT EXISTS idx_interviews_press_id ON interviews (press_id);
CREATE INDEX IF NOT EXISTS idx_press_screenings_film_id ON press_screenings (film_id);
CREATE INDEX IF NOT EXISTS idx_screener_access_film_id ON screener_access (film_id);
CREATE INDEX IF NOT EXISTS idx_press_requests_film_id ON press_requests (film_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module_id ON user_permissions (module_id);

-- Archive indexes
CREATE INDEX IF NOT EXISTS idx_archive_2024_short_films_program_id ON archive_2024_short_films (shorts_program_id);
CREATE INDEX IF NOT EXISTS idx_archive_2024_interviews_film_id ON archive_2024_interviews (film_id);
CREATE INDEX IF NOT EXISTS idx_archive_2024_press_screenings_film_id ON archive_2024_press_screenings (film_id);

-- Enable Row Level Security
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE press ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE screener_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_carpets ENABLE ROW LEVEL SECURITY;
ALTER TABLE programming_pipeline ENABLE ROW LEVEL SECURITY;

-- Archive tables RLS
ALTER TABLE archive_2024_feature_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_shorts_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_short_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_press ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_press_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_screener_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_press_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_photo_shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_in_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_red_carpets ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_2024_programming_pipeline ENABLE ROW LEVEL SECURITY;