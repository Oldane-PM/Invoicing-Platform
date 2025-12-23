-- ============================================
-- COMBINED MIGRATIONS
-- Generated: 2025-12-18T23:04:29.948Z
-- Total Migrations: 9
-- ============================================
-- 
-- Instructions:
-- 1. Go to https://app.supabase.com
-- 2. Select your project
-- 3. Navigate to: SQL Editor
-- 4. Create a new query
-- 5. Copy and paste this entire file
-- 6. Click "Run" to execute all migrations
--
-- ============================================


-- ============================================
-- Migration 1/9: 001_initial_schema.sql
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  submission_date DATE NOT NULL,
  hours_submitted INTEGER NOT NULL CHECK (hours_submitted >= 0),
  overtime_hours INTEGER CHECK (overtime_hours >= 0),
  description TEXT NOT NULL,
  overtime_description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'payment_done')),
  invoice_id UUID,
  rejection_reason TEXT,
  acted_by_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  acted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table (manager-employee relationships)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name VARCHAR(255),
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id, employee_id),
  CHECK (contract_end > contract_start)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('submission_approved', 'submission_rejected', 'team_removed', 'team_added')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table (for storing invoice data)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  date VARCHAR(100) NOT NULL,
  due_date VARCHAR(100) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  from_address TEXT,
  from_state VARCHAR(100),
  from_country VARCHAR(100),
  from_email VARCHAR(255),
  bill_to_company VARCHAR(255) NOT NULL,
  bill_to_address TEXT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  bank_name VARCHAR(255),
  bank_address TEXT,
  swift_code VARCHAR(50),
  aba_wire_routing VARCHAR(50),
  account_type VARCHAR(50),
  currency VARCHAR(10),
  account_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_employee_id ON submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_manager_id ON submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_team_members_manager_id ON team_members(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




-- ============================================
-- Migration 2/9: 002_rls_policies.sql
-- ============================================

-- Enable Row-Level Security on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Employees policies
-- Employees can read their own record
CREATE POLICY "Employees can view own profile"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text);

-- Managers can view employees in their team
CREATE POLICY "Managers can view team employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = employees.id
      AND team_members.manager_id::text = auth.uid()::text
    )
    OR role = 'manager'
    OR role = 'admin'
  );

-- Admins can view all employees
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Submissions policies
-- Employees can view their own submissions
CREATE POLICY "Employees can view own submissions"
  ON submissions FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- Employees can create their own submissions
CREATE POLICY "Employees can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (employee_id::text = auth.uid()::text);

-- Employees can update their own pending submissions
CREATE POLICY "Employees can update own pending submissions"
  ON submissions FOR UPDATE
  USING (
    employee_id::text = auth.uid()::text
    AND status = 'submitted'
  );

-- Managers can view submissions from their team
CREATE POLICY "Managers can view team submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

-- Managers can update submissions from their team (approve/reject)
CREATE POLICY "Managers can update team submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Team members policies
-- Managers can view their team members
CREATE POLICY "Managers can view own team"
  ON team_members FOR SELECT
  USING (manager_id::text = auth.uid()::text);

-- Managers can add employees to their team
CREATE POLICY "Managers can add to own team"
  ON team_members FOR INSERT
  WITH CHECK (manager_id::text = auth.uid()::text);

-- Managers can remove employees from their team
CREATE POLICY "Managers can remove from own team"
  ON team_members FOR DELETE
  USING (manager_id::text = auth.uid()::text);

-- Employees can view if they're in a team
CREATE POLICY "Employees can view own team membership"
  ON team_members FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- Admins can view all team members
CREATE POLICY "Admins can view all team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Notifications policies
-- Employees can view their own notifications
CREATE POLICY "Employees can view own notifications"
  ON notifications FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- System can create notifications (this will be done via service role)
-- For now, allow employees to see notifications created for them
CREATE POLICY "Employees can update own notifications"
  ON notifications FOR UPDATE
  USING (employee_id::text = auth.uid()::text);

-- Projects policies
-- Everyone can view projects
CREATE POLICY "Everyone can view projects"
  ON projects FOR SELECT
  USING (true);

-- Admins can manage projects
CREATE POLICY "Admins can manage projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Invoices policies
-- Employees can view invoices for their submissions
CREATE POLICY "Employees can view own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = invoices.submission_id
      AND submissions.employee_id::text = auth.uid()::text
    )
  );

-- Managers can view invoices for their team's submissions
CREATE POLICY "Managers can view team invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      JOIN team_members ON submissions.employee_id = team_members.employee_id
      WHERE submissions.id = invoices.submission_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );




-- ============================================
-- Migration 3/9: 003_add_employee_profile_fields.sql
-- ============================================

-- Add employee profile fields to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS state_parish VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS zip_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_address TEXT,
ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS aba_wire_routing VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS active_project VARCHAR(255),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS project_types TEXT[];




-- ============================================
-- Migration 4/9: 004_fix_rls_policies.sql
-- ============================================

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




-- ============================================
-- Migration 5/9: 004_unified_submission_status.sql
-- ============================================

-- Migration: Unified Submission Status System
-- This migration updates the submissions table to use the new canonical status enum
-- and adds manager_comment and admin_comment fields.

-- 1. Add new comment columns
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS manager_comment TEXT,
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- 2. Migrate existing status values to new canonical format
-- Old values: 'submitted', 'approved', 'rejected', 'payment_done'
-- New values: 'SUBMITTED', 'MANAGER_REJECTED', 'MANAGER_APPROVED', 'ADMIN_PAID', 'ADMIN_REJECTED', 'NEEDS_CLARIFICATION'

UPDATE submissions SET status = 'SUBMITTED' WHERE status = 'submitted';
UPDATE submissions SET status = 'MANAGER_APPROVED' WHERE status = 'approved';
UPDATE submissions SET status = 'MANAGER_REJECTED' WHERE status = 'rejected';
UPDATE submissions SET status = 'ADMIN_PAID' WHERE status = 'payment_done';

-- 3. Copy existing rejection_reason to manager_comment (if it was a manager rejection)
UPDATE submissions 
SET manager_comment = rejection_reason 
WHERE rejection_reason IS NOT NULL 
  AND status = 'MANAGER_REJECTED';

-- 4. (Optional) Add a check constraint for valid status values
-- Uncomment if you want to enforce at DB level
-- ALTER TABLE submissions
-- ADD CONSTRAINT submissions_status_check 
-- CHECK (status IN ('SUBMITTED', 'MANAGER_REJECTED', 'MANAGER_APPROVED', 'ADMIN_PAID', 'ADMIN_REJECTED', 'NEEDS_CLARIFICATION'));

-- 5. Verify migration
SELECT status, COUNT(*) as count FROM submissions GROUP BY status;




-- ============================================
-- Migration 6/9: 005_disable_rls_temporarily.sql
-- ============================================

-- ============================================
-- TEMPORARILY DISABLE RLS (Until Auth is Implemented)
-- ============================================
-- Since we're using localStorage for auth (not Supabase Auth),
-- RLS policies with auth.uid() won't work.
-- Disable RLS temporarily until proper authentication is implemented.

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Note: Once you implement Better-Auth or Supabase Auth,
-- re-enable RLS and create proper policies that work with your auth system.




-- ============================================
-- Migration 7/9: 005_notifications_table.sql
-- ============================================

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




-- ============================================
-- Migration 8/9: 006_add_idempotency_key.sql
-- ============================================

-- Add idempotency_key column to submissions table
-- This prevents duplicate submissions from double-clicks or network retries

-- Add the column (nullable to not break existing records)
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Add a unique constraint on idempotency_key
-- This ensures each idempotency key can only be used once
CREATE UNIQUE INDEX IF NOT EXISTS submissions_idempotency_key_idx 
ON submissions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add a unique constraint on (employee_id, submission_month, submission_year)
-- This enforces the business rule: one submission per employee per month
-- First, create a function to extract month and year from submission_date
CREATE OR REPLACE FUNCTION get_submission_month_year(submission_date DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(submission_date, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a unique index for business rule enforcement
CREATE UNIQUE INDEX IF NOT EXISTS submissions_employee_month_year_idx
ON submissions(employee_id, (get_submission_month_year(submission_date)));

-- Comment on the new column
COMMENT ON COLUMN submissions.idempotency_key IS 'Unique key per submission attempt to prevent duplicates from double-clicks';





-- ============================================
-- Migration 9/9: 007_add_fixed_income_support.sql
-- ============================================

-- Add fixed income support to employees table
-- This migration adds rate_type, monthly_rate, and overtime_rate columns

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'fixed')),
ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10, 2);

-- Update existing employees to have a default rate_type of 'hourly' if they have an hourly_rate
UPDATE employees 
SET rate_type = 'hourly' 
WHERE hourly_rate IS NOT NULL AND rate_type IS NULL;

-- Add helpful comments
COMMENT ON COLUMN employees.rate_type IS 'Employee compensation type: hourly or fixed monthly';
COMMENT ON COLUMN employees.monthly_rate IS 'Fixed monthly payment amount (used when rate_type = fixed)';
COMMENT ON COLUMN employees.overtime_rate IS 'Overtime hourly rate (used when rate_type = hourly)';

-- Create index for rate_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_employees_rate_type ON employees(rate_type);




-- ============================================
-- Refresh Schema Cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- Migrations Complete! 
-- ============================================
