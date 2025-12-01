-- ============================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;
DROP POLICY IF EXISTS "Managers can view team employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Employees can create own submissions" ON submissions;
DROP POLICY IF EXISTS "Employees can update own pending submissions" ON submissions;
DROP POLICY IF EXISTS "Managers can view team submissions" ON submissions;
DROP POLICY IF EXISTS "Managers can update team submissions" ON submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON submissions;
DROP POLICY IF EXISTS "Managers can view own team" ON team_members;
DROP POLICY IF EXISTS "Managers can add to own team" ON team_members;
DROP POLICY IF EXISTS "Managers can remove from own team" ON team_members;
DROP POLICY IF EXISTS "Employees can view own team membership" ON team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON team_members;
DROP POLICY IF EXISTS "Employees can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Employees can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Everyone can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Employees can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Managers can view team invoices" ON invoices;

-- ============================================
-- SIMPLIFIED POLICIES (No Recursion)
-- ============================================

-- NOTE: Since we're using localStorage for auth (not Supabase Auth),
-- these policies will need to be adjusted or RLS disabled temporarily.
-- For now, we'll create policies that work with direct ID matching.

-- Employees policies
-- Allow employees to view their own record by ID
CREATE POLICY "Employees can view own profile"
  ON employees FOR SELECT
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow employees to update their own record
CREATE POLICY "Employees can update own profile"
  ON employees FOR UPDATE
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Submissions policies
-- Allow employees to view their own submissions
CREATE POLICY "Employees can view own submissions"
  ON submissions FOR SELECT
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow employees to create their own submissions
CREATE POLICY "Employees can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (true); -- Temporarily allow all until proper auth is implemented

-- Allow employees to update their own pending submissions
CREATE POLICY "Employees can update own pending submissions"
  ON submissions FOR UPDATE
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow employees to delete their own pending submissions
CREATE POLICY "Employees can delete own pending submissions"
  ON submissions FOR DELETE
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Team members policies
-- Allow viewing team members
CREATE POLICY "Everyone can view team members"
  ON team_members FOR SELECT
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow managers to add to their team
CREATE POLICY "Managers can add to team"
  ON team_members FOR INSERT
  WITH CHECK (true); -- Temporarily allow all until proper auth is implemented

-- Allow managers to remove from their team
CREATE POLICY "Managers can remove from team"
  ON team_members FOR DELETE
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Notifications policies
-- Allow employees to view their own notifications
CREATE POLICY "Employees can view own notifications"
  ON notifications FOR SELECT
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow updating notifications
CREATE POLICY "Employees can update own notifications"
  ON notifications FOR UPDATE
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow creating notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Temporarily allow all until proper auth is implemented

-- Projects policies
-- Everyone can view projects
CREATE POLICY "Everyone can view projects"
  ON projects FOR SELECT
  USING (true);

-- Everyone can manage projects (for now)
CREATE POLICY "Everyone can manage projects"
  ON projects FOR ALL
  USING (true);

-- Invoices policies
-- Allow viewing invoices
CREATE POLICY "Everyone can view invoices"
  ON invoices FOR SELECT
  USING (true); -- Temporarily allow all until proper auth is implemented

-- Allow creating invoices
CREATE POLICY "System can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (true); -- Temporarily allow all until proper auth is implemented

