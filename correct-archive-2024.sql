-- Archive 2024 Festival Data
-- Only includes tables that actually exist and are used in the application

CREATE TABLE IF NOT EXISTS archive_2024_festival_settings AS
SELECT * FROM festival_settings;

CREATE TABLE IF NOT EXISTS archive_2024_feature_films AS
SELECT * FROM feature_films;

CREATE TABLE IF NOT EXISTS archive_2024_short_films AS
SELECT * FROM short_films;

CREATE TABLE IF NOT EXISTS archive_2024_programs AS
SELECT * FROM programs;

CREATE TABLE IF NOT EXISTS archive_2024_press AS
SELECT * FROM press;

CREATE TABLE IF NOT EXISTS archive_2024_press_screenings AS
SELECT * FROM press_screenings;

CREATE TABLE IF NOT EXISTS archive_2024_press_requests AS
SELECT * FROM press_requests;

CREATE TABLE IF NOT EXISTS archive_2024_screener_access AS
SELECT * FROM screener_access;

CREATE TABLE IF NOT EXISTS archive_2024_photo_shoots AS
SELECT * FROM photo_shoots;

CREATE TABLE IF NOT EXISTS archive_2024_red_carpets AS
SELECT * FROM red_carpets;

CREATE TABLE IF NOT EXISTS archive_2024_special_events AS
SELECT * FROM special_events;

CREATE TABLE IF NOT EXISTS archive_2024_published_screenings AS
SELECT * FROM published_screenings;

CREATE TABLE IF NOT EXISTS archive_2024_pi_jury_screenings AS
SELECT * FROM pi_jury_screenings;

CREATE TABLE IF NOT EXISTS archive_2024_tech_check_screenings AS
SELECT * FROM tech_check_screenings;

CREATE TABLE IF NOT EXISTS archive_2024_film_contacts AS
SELECT * FROM film_contacts;

CREATE TABLE IF NOT EXISTS archive_2024_venues AS
SELECT * FROM venues;

CREATE TABLE IF NOT EXISTS archive_2024_screening_invitations AS
SELECT * FROM screening_invitations;

-- Create archive registry
CREATE TABLE IF NOT EXISTS archive_registry (
  year INTEGER PRIMARY KEY,
  festival_name TEXT,
  edition TEXT,
  start_date DATE,
  end_date DATE,
  archived_at TIMESTAMP DEFAULT NOW()
);

-- Add 2024 to registry
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