-- Row Level Security Policies
-- Run this AFTER the database-schema.sql

-- Enable RLS on all tables
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_tokens ENABLE ROW LEVEL SECURITY;

-- User Permissions Policies
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions" ON user_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Feature Films Policies
CREATE POLICY "Authenticated users can view feature films" ON feature_films
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage feature films" ON feature_films
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Short Films Policies  
CREATE POLICY "Authenticated users can view short films" ON short_films
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage short films" ON short_films
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Shorts Programs Policies
CREATE POLICY "Authenticated users can view shorts programs" ON shorts_programs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage shorts programs" ON shorts_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RSVP Policies (more permissive for external access)
CREATE POLICY "Anyone can view RSVP forms" ON rsvp_forms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage RSVP forms" ON rsvp_forms
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can submit RSVP responses" ON rsvp_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view RSVP responses" ON rsvp_responses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can validate RSVP tokens" ON rsvp_tokens
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage RSVP tokens" ON rsvp_tokens
  FOR ALL USING (auth.role() = 'authenticated');