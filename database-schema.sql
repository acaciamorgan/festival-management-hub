-- Festival Management Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Permissions Table
CREATE TABLE user_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_permissions JSONB DEFAULT '{}',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Shorts Programs Table
CREATE TABLE shorts_programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_number INTEGER NOT NULL,
  program_name TEXT NOT NULL,
  description TEXT,
  total_runtime INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Feature Films Table
CREATE TABLE feature_films (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Core Film Info
  title TEXT,
  source TEXT,
  original_language_title TEXT,
  director TEXT, -- comma-separated, can link to guests
  countries TEXT, -- comma-separated
  original_release_year INTEGER,
  run_time INTEGER, -- in minutes
  language TEXT,
  
  -- Festival Programming
  program_1 TEXT,
  program_2 TEXT,
  program_3 TEXT,
  program_4 TEXT,
  genre_1 TEXT,
  genre_2 TEXT,
  genre_3 TEXT,
  genre_4 TEXT,
  premiere_status TEXT,
  
  -- Technical/Production
  subtitles TEXT, -- Yes/No
  captions TEXT, -- open/closed/no
  screenwriter TEXT, -- comma-separated
  cinematographer TEXT, -- comma-separated
  art_director TEXT, -- comma-separated
  editor TEXT, -- comma-separated
  principal_cast TEXT, -- comma-separated, can link to guests
  sound_designer TEXT, -- comma-separated
  music_score TEXT, -- comma-separated
  producer TEXT, -- comma-separated, can link to guests
  executive_producer TEXT, -- comma-separated, can link to guests
  production_companies TEXT, -- comma-separated
  
  -- Media/Links
  film_website TEXT,
  trailer_url TEXT, -- YouTube/Vimeo
  
  -- Content
  content_warnings TEXT,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Short Films Table
CREATE TABLE short_films (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Core Film Info (similar to features)
  title TEXT,
  source TEXT,
  original_language_title TEXT,
  director TEXT, -- comma-separated, can link to guests
  countries TEXT, -- comma-separated
  original_release_year INTEGER,
  run_time INTEGER, -- in minutes
  language TEXT,
  
  -- Shorts-specific
  shorts_program_id UUID REFERENCES shorts_programs(id),
  program_order INTEGER, -- order within the program
  
  -- Technical/Production (simplified for shorts)
  subtitles TEXT, -- Yes/No
  captions TEXT, -- open/closed/no
  screenwriter TEXT, -- comma-separated
  cinematographer TEXT, -- comma-separated
  art_director TEXT, -- comma-separated
  editor TEXT, -- comma-separated
  principal_cast TEXT, -- comma-separated, can link to guests
  sound_designer TEXT, -- comma-separated
  music_score TEXT, -- comma-separated
  producer TEXT, -- comma-separated, can link to guests
  executive_producer TEXT, -- comma-separated, can link to guests
  production_companies TEXT, -- comma-separated
  
  -- Media/Links
  film_website TEXT,
  trailer_url TEXT, -- YouTube/Vimeo
  
  -- Content
  content_warnings TEXT,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Press Table (Accredited Journalists)
CREATE TABLE press (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic Contact Information
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  
  -- Professional Details  
  media_outlet TEXT NOT NULL, -- Primary outlet
  secondary_outlets TEXT, -- Comma-separated secondary outlets
  
  -- Outlet URLs
  website_url TEXT, -- Primary outlet URL
  secondary_outlet_urls TEXT, -- Comma-separated secondary outlet URLs (same order as outlets)
  
  -- Social Media (JSON format)
  social_media JSONB, -- {"twitter": "@username", "instagram": "@username", "bluesky": "@username", "youtube": "@channelname"}
  
  -- Professional Credentials
  rotten_tomatoes_accredited BOOLEAN DEFAULT FALSE,
  critics_groups TEXT, -- Comma-separated list
  
  -- Accreditation Status
  credential_status TEXT, -- "Approved", "Pending", "Denied"
  accreditation_level TEXT DEFAULT 'Unassigned', -- "P", "G", "Unassigned"
  
  -- Credential Pickup Tracking
  picked_up_credentials BOOLEAN DEFAULT FALSE,
  
  -- Optional Details
  preferred_contact_method TEXT, -- "Email", "Phone"
  
  -- Festival-Specific
  special_requirements TEXT,
  internal_notes TEXT,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 6. RSVP Forms Table
CREATE TABLE rsvp_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RSVP Responses Table
CREATE TABLE rsvp_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id TEXT NOT NULL,
  responses JSONB NOT NULL,
  linked_card_id UUID,
  linked_card_type TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. RSVP Tokens Table
CREATE TABLE rsvp_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_feature_films_title ON feature_films(title);
CREATE INDEX idx_feature_films_director ON feature_films(director);
CREATE INDEX idx_short_films_title ON short_films(title);
CREATE INDEX idx_short_films_program ON short_films(shorts_program_id);
CREATE INDEX idx_short_films_order ON short_films(shorts_program_id, program_order);
CREATE INDEX idx_press_name ON press(name);
CREATE INDEX idx_press_email ON press(email);
CREATE INDEX idx_press_outlet ON press(media_outlet);
CREATE INDEX idx_press_accreditation ON press(accreditation_level);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_rsvp_responses_event_id ON rsvp_responses(event_id);
CREATE INDEX idx_rsvp_tokens_token ON rsvp_tokens(token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shorts_programs_updated_at BEFORE UPDATE ON shorts_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_films_updated_at BEFORE UPDATE ON feature_films FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_short_films_updated_at BEFORE UPDATE ON short_films FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_press_updated_at BEFORE UPDATE ON press FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();