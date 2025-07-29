-- Create additional tables for Ticketing module
-- Run this in your Supabase SQL Editor

-- 1. Published Screenings Table (for screenings published from Ticketing Grid - Working)
CREATE TABLE published_screenings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticketing_screening_id UUID NOT NULL, -- Reference to original screening
  film_card_id UUID, -- Reference to matched film card
  film_title TEXT NOT NULL,
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER, -- in minutes
  venue_short_code TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  published_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. P&I/Jury Screenings Table
CREATE TABLE pi_jury_screenings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  film_title TEXT NOT NULL,
  screening_type TEXT NOT NULL CHECK (screening_type IN ('P&I', 'Jury')),
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER, -- in minutes
  venue_short_code TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tech Check Screenings Table
CREATE TABLE tech_check_screenings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  film_title TEXT NOT NULL,
  screening_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  run_time INTEGER, -- in minutes
  venue_short_code TEXT NOT NULL,
  tech_contact TEXT,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at triggers
CREATE TRIGGER update_published_screenings_updated_at 
  BEFORE UPDATE ON published_screenings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pi_jury_screenings_updated_at 
  BEFORE UPDATE ON pi_jury_screenings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tech_check_screenings_updated_at 
  BEFORE UPDATE ON tech_check_screenings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_published_screenings_date ON published_screenings(screening_date);
CREATE INDEX idx_published_screenings_venue ON published_screenings(venue_short_code);
CREATE INDEX idx_published_screenings_ticketing_id ON published_screenings(ticketing_screening_id);
CREATE INDEX idx_published_screenings_film_card_id ON published_screenings(film_card_id);

CREATE INDEX idx_pi_jury_screenings_date ON pi_jury_screenings(screening_date);
CREATE INDEX idx_pi_jury_screenings_venue ON pi_jury_screenings(venue_short_code);
CREATE INDEX idx_pi_jury_screenings_type ON pi_jury_screenings(screening_type);

CREATE INDEX idx_tech_check_screenings_date ON tech_check_screenings(screening_date);
CREATE INDEX idx_tech_check_screenings_venue ON tech_check_screenings(venue_short_code);

-- Disable RLS for these tables (following existing pattern)
ALTER TABLE published_screenings DISABLE ROW LEVEL SECURITY;
ALTER TABLE pi_jury_screenings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tech_check_screenings DISABLE ROW LEVEL SECURITY;