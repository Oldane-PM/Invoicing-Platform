-- =====================================================
-- Employee Onboarding System - FINAL FIXED VERSION
-- =====================================================
-- Fixed: Removed OLD/NEW references from RLS policies
-- =====================================================

-- =====================================================
-- 1. Add onboarding fields to employees table
-- =====================================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS personal_info_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banking_info_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approval_status TEXT DEFAULT 'NOT_SUBMITTED' CHECK (admin_approval_status IN ('NOT_SUBMITTED', 'WAITING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS contract_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_completed_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS manager_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'INCOMPLETE' CHECK (onboarding_status IN ('INCOMPLETE', 'COMPLETE'));

-- Add comments for clarity
COMMENT ON COLUMN employees.personal_info_completed_at IS 'Timestamp when employee completed personal information form (Step 1)';
COMMENT ON COLUMN employees.banking_info_completed_at IS 'Timestamp when employee completed banking details form (Step 2)';
COMMENT ON COLUMN employees.onboarding_submitted_at IS 'Timestamp when employee submitted both forms for admin review (Step 3)';
COMMENT ON COLUMN employees.admin_approval_status IS 'Admin review status: NOT_SUBMITTED, WAITING, APPROVED, REJECTED';
COMMENT ON COLUMN employees.admin_rejection_reason IS 'Reason provided by admin if rejected';
COMMENT ON COLUMN employees.admin_approved_at IS 'Timestamp when admin approved the onboarding (Step 4)';
COMMENT ON COLUMN employees.contract_completed_at IS 'Timestamp when admin completed contract setup (Step 5)';
COMMENT ON COLUMN employees.manager_assigned_at IS 'Timestamp when manager was assigned (Step 6)';
COMMENT ON COLUMN employees.onboarding_status IS 'Overall onboarding completion status';

-- =====================================================
-- 2. Create function to compute onboarding progress
-- =====================================================
CREATE OR REPLACE FUNCTION compute_onboarding_progress(employee_row employees)
RETURNS INTEGER AS $$
DECLARE
  completed_steps INTEGER := 0;
BEGIN
  -- Step 1: Submit Request (account exists)
  completed_steps := 1;
  
  -- Step 2: Personal Information
  IF employee_row.personal_info_completed_at IS NOT NULL THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  -- Step 3: Banking Information (submitted)
  IF employee_row.banking_info_completed_at IS NOT NULL AND employee_row.onboarding_submitted_at IS NOT NULL THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  -- Step 4: Admin Approval
  IF employee_row.admin_approval_status = 'APPROVED' THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  -- Step 5: Contract Information Updated
  IF employee_row.contract_completed_at IS NOT NULL THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  -- Step 6: Manager Assigned
  IF employee_row.reporting_manager_id IS NOT NULL AND employee_row.manager_assigned_at IS NOT NULL THEN
    completed_steps := completed_steps + 1;
  END IF;
  
  RETURN completed_steps;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 3. Create function to update onboarding status
-- =====================================================
CREATE OR REPLACE FUNCTION update_onboarding_status()
RETURNS TRIGGER AS $$
DECLARE
  completed_steps INTEGER;
BEGIN
  completed_steps := compute_onboarding_progress(NEW);
  
  IF completed_steps >= 6 THEN
    NEW.onboarding_status := 'COMPLETE';
  ELSE
    NEW.onboarding_status := 'INCOMPLETE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Create trigger to auto-update onboarding status
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_onboarding_status ON employees;
CREATE TRIGGER trigger_update_onboarding_status
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_status();

-- =====================================================
-- 5. Create view for onboarding queue (Admin)
-- =====================================================
CREATE OR REPLACE VIEW admin_onboarding_queue AS
SELECT 
  e.id,
  e.name,
  e.email,
  e.role,
  e.personal_info_completed_at,
  e.banking_info_completed_at,
  e.onboarding_submitted_at,
  e.admin_approval_status,
  e.admin_rejection_reason,
  e.admin_approved_at,
  e.contract_completed_at,
  e.manager_assigned_at,
  e.reporting_manager_id,
  e.onboarding_status,
  compute_onboarding_progress(e.*) as progress_steps,
  m.name as manager_name,
  e.created_at,
  e.updated_at
FROM employees e
LEFT JOIN employees m ON e.reporting_manager_id = m.id
WHERE e.role = 'EMPLOYEE'
  AND e.onboarding_status = 'INCOMPLETE'
ORDER BY 
  CASE e.admin_approval_status
    WHEN 'WAITING' THEN 1
    WHEN 'REJECTED' THEN 2
    ELSE 3
  END,
  e.onboarding_submitted_at DESC NULLS LAST;

GRANT SELECT ON admin_onboarding_queue TO authenticated;

-- =====================================================
-- 6. Create helper function to resubmit after rejection
-- =====================================================
CREATE OR REPLACE FUNCTION employee_resubmit_onboarding(employee_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE employees
  SET 
    admin_approval_status = 'WAITING',
    admin_rejection_reason = NULL,
    onboarding_submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = employee_id
    AND admin_approval_status = 'REJECTED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_onboarding_status ON employees(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_employees_admin_approval_status ON employees(admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_employees_onboarding_submitted ON employees(onboarding_submitted_at) WHERE onboarding_submitted_at IS NOT NULL;

-- =====================================================
-- 8. Notification type enums (optional)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ONBOARDING_APPROVED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ONBOARDING_REJECTED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ONBOARDING_CONTRACT_COMPLETE';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ONBOARDING_MANAGER_ASSIGNED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ONBOARDING_COMPLETE';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- Migration Complete! ✅
-- =====================================================

