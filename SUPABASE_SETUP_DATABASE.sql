-- ========================================
-- MASTER DATABASE SETUP SCRIPT
-- Run this ONCE in Supabase SQL Editor
-- ========================================
-- This script creates all necessary tables and sets up the database
-- Run in order, all at once (copy-paste entire file)

-- ========================================
-- Step 1: Create employees table
-- ========================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  hourly_rate NUMERIC(10, 2),
  overtime_rate NUMERIC(10, 2),
  monthly_rate NUMERIC(10, 2),
  rate_type TEXT CHECK (rate_type IN ('hourly', 'fixed')),
  active_project TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_type TEXT,
  position TEXT,
  region TEXT,
  country TEXT,
  
  -- Onboarding tracking
  onboarding_status TEXT DEFAULT 'INCOMPLETE' CHECK (onboarding_status IN ('INCOMPLETE', 'COMPLETE')),
  personal_info_completed_at TIMESTAMPTZ,
  banking_info_completed_at TIMESTAMPTZ,
  contract_completed_at TIMESTAMPTZ,
  admin_approval_status TEXT CHECK (admin_approval_status IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED')),
  admin_approved_at TIMESTAMPTZ,
  manager_assigned_at TIMESTAMPTZ,
  
  -- Reporting manager (self-referencing FK)
  reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Step 2: Create submissions table
-- ========================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  submission_date DATE NOT NULL,
  hours_submitted INTEGER NOT NULL CHECK (hours_submitted >= 0),
  overtime_hours INTEGER CHECK (overtime_hours >= 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'payment_done')),
  invoice_id UUID,
  rejection_reason TEXT,
  acted_by_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Step 3: Create team_members table
-- ========================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID,
  project_name TEXT,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, employee_id),
  CHECK (contract_end > contract_start)
);

-- ========================================
-- Step 4: Create invoices table
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Step 5: Create notifications table
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Step 6: Create onboarding tables
-- ========================================
CREATE TYPE onboarding_state AS ENUM ('draft', 'submitted', 'reviewing', 'approved', 'rejected', 'closed');

CREATE TABLE IF NOT EXISTS onboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  current_state onboarding_state NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS onboarding_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS onboarding_banking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_number TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  currency TEXT DEFAULT 'USD',
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Step 7: Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager ON employees(reporting_manager_id);

CREATE INDEX IF NOT EXISTS idx_submissions_employee_id ON submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_manager_id ON submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submission_date);

CREATE INDEX IF NOT EXISTS idx_team_members_manager_id ON team_members(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);

CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_onboarding_cases_user_id ON onboarding_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_state ON onboarding_cases(current_state);
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_submitted ON onboarding_cases(submitted_at) WHERE submitted_at IS NOT NULL;

-- ========================================
-- Step 8: Create helper functions
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_cases_updated_at
  BEFORE UPDATE ON onboarding_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Step 9: Enable Row Level Security
-- ========================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 10: Create RLS Policies
-- ========================================

-- Employees policies
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own employee record" ON employees;
CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (user_id = auth.uid());

-- Submissions policies
DROP POLICY IF EXISTS "Employees can submit own hours" ON submissions;
CREATE POLICY "Employees can submit own hours"
  ON submissions FOR INSERT
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (employee_id = auth.uid());

-- Onboarding policies
DROP POLICY IF EXISTS "Users can view own onboarding case" ON onboarding_cases;
CREATE POLICY "Users can view own onboarding case"
  ON onboarding_cases FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own onboarding case" ON onboarding_cases;
CREATE POLICY "Users can create own onboarding case"
  ON onboarding_cases FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own onboarding case" ON onboarding_cases;
CREATE POLICY "Users can update own onboarding case"
  ON onboarding_cases FOR UPDATE
  USING (user_id = auth.uid());

-- Onboarding personal policies
DROP POLICY IF EXISTS "Users can manage own personal info" ON onboarding_personal;
CREATE POLICY "Users can manage own personal info"
  ON onboarding_personal FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases 
      WHERE onboarding_cases.id = onboarding_personal.case_id 
      AND onboarding_cases.user_id = auth.uid()
    )
  );

-- Onboarding banking policies
DROP POLICY IF EXISTS "Users can manage own banking info" ON onboarding_banking;
CREATE POLICY "Users can manage own banking info"
  ON onboarding_banking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases 
      WHERE onboarding_cases.id = onboarding_banking.case_id 
      AND onboarding_cases.user_id = auth.uid()
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (employee_id = auth.uid());

-- ========================================
-- ✅ SETUP COMPLETE!
-- ========================================
SELECT 'Database setup complete! ✅' AS status;

-- Verify tables were created
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('employees', 'submissions', 'team_members', 'invoices', 'notifications', 
                     'onboarding_cases', 'onboarding_personal', 'onboarding_banking')
ORDER BY table_name;

