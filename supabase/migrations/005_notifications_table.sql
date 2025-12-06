-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_role_idx ON notifications(role, created_at DESC);

-- Grant permissions (if using RLS, adjust as needed)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (true);

-- Policy to allow inserts (for backend/admin)
CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Policy to allow updates (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (true);

