-- ============================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE TABLES
-- ============================================

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

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

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

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ENABLE ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Note: These policies use auth.uid() which works with Supabase Auth
-- If using Better-Auth, you may need to adjust these policies

-- Drop existing policies if they exist
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

-- Employees policies
CREATE POLICY "Employees can view own profile"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text);

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
CREATE POLICY "Employees can view own submissions"
  ON submissions FOR SELECT
  USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can update own pending submissions"
  ON submissions FOR UPDATE
  USING (
    employee_id::text = auth.uid()::text
    AND status = 'submitted'
  );

CREATE POLICY "Managers can view team submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Managers can update team submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

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
CREATE POLICY "Managers can view own team"
  ON team_members FOR SELECT
  USING (manager_id::text = auth.uid()::text);

CREATE POLICY "Managers can add to own team"
  ON team_members FOR INSERT
  WITH CHECK (manager_id::text = auth.uid()::text);

CREATE POLICY "Managers can remove from own team"
  ON team_members FOR DELETE
  USING (manager_id::text = auth.uid()::text);

CREATE POLICY "Employees can view own team membership"
  ON team_members FOR SELECT
  USING (employee_id::text = auth.uid()::text);

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
CREATE POLICY "Employees can view own notifications"
  ON notifications FOR SELECT
  USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can update own notifications"
  ON notifications FOR UPDATE
  USING (employee_id::text = auth.uid()::text);

-- Projects policies
CREATE POLICY "Everyone can view projects"
  ON projects FOR SELECT
  USING (true);

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
CREATE POLICY "Employees can view own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = invoices.submission_id
      AND submissions.employee_id::text = auth.uid()::text
    )
  );

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
-- SETUP COMPLETE!
-- ============================================

