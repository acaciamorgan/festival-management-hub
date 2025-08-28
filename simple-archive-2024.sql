-- Simple Archive System: Create archive_2024_* tables as exact copies of current tables
-- This creates a permanent, read-only snapshot of 2024 festival data

-- Archive festival_settings
CREATE TABLE IF NOT EXISTS archive_2024_festival_settings AS 
SELECT * FROM festival_settings;

-- Archive feature_films
CREATE TABLE IF NOT EXISTS archive_2024_feature_films AS
SELECT * FROM feature_films;

-- Archive short_films  
CREATE TABLE IF NOT EXISTS archive_2024_short_films AS
SELECT * FROM short_films;

-- Archive programs
CREATE TABLE IF NOT EXISTS archive_2024_programs AS
SELECT * FROM programs;

-- Archive press
CREATE TABLE IF NOT EXISTS archive_2024_press AS
SELECT * FROM press;

-- Archive press_journalists
CREATE TABLE IF NOT EXISTS archive_2024_press_journalists AS
SELECT * FROM press_journalists;

-- Archive press_screenings
CREATE TABLE IF NOT EXISTS archive_2024_press_screenings AS
SELECT * FROM press_screenings;

-- Archive press_requests
CREATE TABLE IF NOT EXISTS archive_2024_press_requests AS
SELECT * FROM press_requests;

-- Archive screener_access
CREATE TABLE IF NOT EXISTS archive_2024_screener_access AS
SELECT * FROM screener_access;

-- Archive photo_shoots
CREATE TABLE IF NOT EXISTS archive_2024_photo_shoots AS
SELECT * FROM photo_shoots;

-- Archive red_carpets
CREATE TABLE IF NOT EXISTS archive_2024_red_carpets AS
SELECT * FROM red_carpets;

-- Archive special_events
CREATE TABLE IF NOT EXISTS archive_2024_special_events AS
SELECT * FROM special_events;

-- Archive published_screenings
CREATE TABLE IF NOT EXISTS archive_2024_published_screenings AS
SELECT * FROM published_screenings;

-- Archive pi_jury_screenings
CREATE TABLE IF NOT EXISTS archive_2024_pi_jury_screenings AS
SELECT * FROM pi_jury_screenings;

-- Archive tech_check_screenings
CREATE TABLE IF NOT EXISTS archive_2024_tech_check_screenings AS
SELECT * FROM tech_check_screenings;

-- Archive film_contacts
CREATE TABLE IF NOT EXISTS archive_2024_film_contacts AS
SELECT * FROM film_contacts;

-- Archive venues
CREATE TABLE IF NOT EXISTS archive_2024_venues AS
SELECT * FROM venues;

-- Archive screening_invitations
CREATE TABLE IF NOT EXISTS archive_2024_screening_invitations AS
SELECT * FROM screening_invitations;

-- Archive reports_analytics
CREATE TABLE IF NOT EXISTS archive_2024_reports_analytics AS
SELECT * FROM reports_analytics;

-- Create a simple archive registry table
CREATE TABLE IF NOT EXISTS archive_registry (
  year INTEGER PRIMARY KEY,
  festival_name TEXT,
  edition TEXT,
  start_date DATE,
  end_date DATE,
  archived_at TIMESTAMP DEFAULT NOW()
);

-- Insert 2024 festival info into registry
INSERT INTO archive_registry (year, festival_name, edition, start_date, end_date)
SELECT 
  2024,
  festival_name,
  edition_number || 'th',
  start_date,
  end_date
FROM festival_settings
LIMIT 1
ON CONFLICT (year) DO UPDATE SET
  archived_at = NOW();