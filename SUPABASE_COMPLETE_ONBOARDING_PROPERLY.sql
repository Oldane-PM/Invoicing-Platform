-- =====================================================
-- PROPERLY COMPLETE ONBOARDING FOR ALL 3 TEST USERS
-- =====================================================
-- This script sets all the required fields that the
-- trigger checks to automatically mark onboarding as COMPLETE
-- =====================================================

-- -----------------------------------------------------
-- 1. ADMIN USER (admin@test.com)
-- -----------------------------------------------------
UPDATE employees
SET
  -- Step 2: Personal Info
  personal_info_completed_at = '2024-01-10 10:00:00'::timestamptz,
  
  -- Step 3: Banking Info + Submission
  banking_info_completed_at = '2024-01-10 11:00:00'::timestamptz,
  onboarding_submitted_at = '2024-01-10 12:00:00'::timestamptz,
  
  -- Step 4: Admin Approval
  admin_approval_status = 'APPROVED',
  admin_approved_at = '2024-01-10 13:00:00'::timestamptz,
  
  -- Step 5: Contract Info
  contract_completed_at = '2024-01-10 14:00:00'::timestamptz,
  
  -- Step 6: Manager Assigned (admins report to themselves or no one)
  reporting_manager_id = NULL,  -- Admins don't have a manager
  manager_assigned_at = '2024-01-10 15:00:00'::timestamptz,
  
  updated_at = now()
WHERE email = 'admin@test.com';

-- -----------------------------------------------------
-- 2. MANAGER USER (manager@test.com)
-- -----------------------------------------------------
UPDATE employees
SET
  -- Step 2: Personal Info
  personal_info_completed_at = '2024-01-11 10:00:00'::timestamptz,
  
  -- Step 3: Banking Info + Submission
  banking_info_completed_at = '2024-01-11 11:00:00'::timestamptz,
  onboarding_submitted_at = '2024-01-11 12:00:00'::timestamptz,
  
  -- Step 4: Admin Approval
  admin_approval_status = 'APPROVED',
  admin_approved_at = '2024-01-11 13:00:00'::timestamptz,
  
  -- Step 5: Contract Info
  contract_completed_at = '2024-01-11 14:00:00'::timestamptz,
  
  -- Step 6: Manager Assigned (reports to admin)
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'admin@test.com' LIMIT 1),
  manager_assigned_at = '2024-01-11 15:00:00'::timestamptz,
  
  updated_at = now()
WHERE email = 'manager@test.com';

-- -----------------------------------------------------
-- 3. EMPLOYEE USER (employee@test.com)
-- -----------------------------------------------------
UPDATE employees
SET
  -- Step 2: Personal Info
  personal_info_completed_at = '2024-01-12 10:00:00'::timestamptz,
  
  -- Step 3: Banking Info + Submission
  banking_info_completed_at = '2024-01-12 11:00:00'::timestamptz,
  onboarding_submitted_at = '2024-01-12 12:00:00'::timestamptz,
  
  -- Step 4: Admin Approval
  admin_approval_status = 'APPROVED',
  admin_approved_at = '2024-01-12 13:00:00'::timestamptz,
  
  -- Step 5: Contract Info
  contract_completed_at = '2024-01-12 14:00:00'::timestamptz,
  
  -- Step 6: Manager Assigned (reports to manager)
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com' LIMIT 1),
  manager_assigned_at = '2024-01-12 15:00:00'::timestamptz,
  
  updated_at = now()
WHERE email = 'employee@test.com';

-- =====================================================
-- VERIFY RESULTS
-- =====================================================
SELECT 
  name,
  email,
  role,
  
  -- Check onboarding status (should now be COMPLETE!)
  onboarding_status,
  
  -- Check approval status
  admin_approval_status,
  
  -- Check timestamps
  personal_info_completed_at IS NOT NULL as has_personal_info,
  banking_info_completed_at IS NOT NULL as has_banking_info,
  onboarding_submitted_at IS NOT NULL as was_submitted,
  admin_approved_at IS NOT NULL as was_approved,
  contract_completed_at IS NOT NULL as has_contract,
  manager_assigned_at IS NOT NULL as has_manager_assigned,
  
  -- Check reporting manager
  (SELECT name FROM employees mgr WHERE mgr.id = employees.reporting_manager_id) as reports_to
  
FROM employees
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY 
  CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'employee' THEN 3 
  END;

-- =====================================================
-- EXPECTED RESULT:
-- All 3 users should show:
--   onboarding_status = 'COMPLETE'
--   admin_approval_status = 'APPROVED'
--   All "has_*" columns = true
-- =====================================================

