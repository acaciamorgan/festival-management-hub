-- Update guest table with correct flight fields
-- Run this in your Supabase SQL Editor

-- Drop the old flight fields
ALTER TABLE guests 
DROP COLUMN IF EXISTS arrival_takeoff_time,
DROP COLUMN IF EXISTS arrival_landing_time,
DROP COLUMN IF EXISTS arrival_airline,
DROP COLUMN IF EXISTS arrival_flight_number,
DROP COLUMN IF EXISTS arrival_origin,
DROP COLUMN IF EXISTS arrival_destination,
DROP COLUMN IF EXISTS departure_takeoff_time,
DROP COLUMN IF EXISTS departure_landing_time,
DROP COLUMN IF EXISTS departure_airline,
DROP COLUMN IF EXISTS departure_flight_number,
DROP COLUMN IF EXISTS departure_origin,
DROP COLUMN IF EXISTS departure_destination;

-- Add the correct flight fields
ALTER TABLE guests 
ADD COLUMN arrival_airline TEXT,
ADD COLUMN arrival_flight_number TEXT,
ADD COLUMN inbound_departure_time TEXT,
ADD COLUMN arrival_origin_airport TEXT,
ADD COLUMN arrival_airport TEXT,
ADD COLUMN inbound_arrival_time TEXT,
ADD COLUMN outbound_departure_time TEXT,
ADD COLUMN departure_airline TEXT,
ADD COLUMN departure_flight_number TEXT,
ADD COLUMN departure_airport TEXT,
ADD COLUMN destination_airport TEXT,
ADD COLUMN outbound_arrival_time TEXT;