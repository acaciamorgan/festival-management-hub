CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'other')),
  description TEXT NOT NULL,
  current_page TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_permissions.user_id = auth.uid()
      AND (user_permissions.is_admin = true OR user_permissions.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can update feedback status"
  ON feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_permissions.user_id = auth.uid()
      AND (user_permissions.is_admin = true OR user_permissions.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_permissions.user_id = auth.uid()
      AND (user_permissions.is_admin = true OR user_permissions.is_super_admin = true)
    )
  );
