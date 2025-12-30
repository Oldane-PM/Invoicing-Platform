-- =====================================================
-- COMPLETE EMPLOYEE USER DATA (Skip Onboarding)
-- =====================================================
-- This script fully populates employee@test.com with all
-- required data so they can skip onboarding and go straight
-- to the dashboard.
-- =====================================================

-- Step 1: Update all employee information
UPDATE employees
SET
  -- Personal Information
  name = 'Michael Brown',
  email = 'employee@test.com',
  phone = '(876) 555-3003',
  address = '789 Worker Street, Kingston, Jamaica',
  
  -- Banking Information
  bank_name = 'Jamaica National Bank',
  account_type = 'Checking',
  
  -- Employment Information
  position = 'Software Developer',
  hourly_rate = 45.00,
  role = 'employee',
  status = 'active',
  
  -- Reporting Hierarchy
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com' LIMIT 1),
  
  -- Onboarding Completion Fields (Step 2-6)
  personal_info_completed_at = '2024-01-12 10:00:00'::timestamptz,
  banking_info_completed_at = '2024-01-12 11:00:00'::timestamptz,
  onboarding_submitted_at = '2024-01-12 12:00:00'::timestamptz,
  admin_approval_status = 'APPROVED',
  admin_approved_at = '2024-01-12 13:00:00'::timestamptz,
  contract_completed_at = '2024-01-12 14:00:00'::timestamptz,
  manager_assigned_at = '2024-01-12 15:00:00'::timestamptz,
  
  -- This will auto-update to COMPLETE via trigger
  -- onboarding_status = 'COMPLETE',
  
  updated_at = NOW()
  
WHERE email = 'employee@test.com';

-- Step 2: Verify employee data is complete
SELECT 
  name,
  email,
  role,
  status,
  phone,
  address,
  bank_name,
  account_type,
  position,
  hourly_rate,
  
  -- Onboarding Status
  onboarding_status,
  admin_approval_status,
  
  -- Check all completion timestamps
  personal_info_completed_at IS NOT NULL as personal_complete,
  banking_info_completed_at IS NOT NULL as banking_complete,
  onboarding_submitted_at IS NOT NULL as submitted,
  admin_approved_at IS NOT NULL as approved,
  contract_completed_at IS NOT NULL as contract_complete,
  manager_assigned_at IS NOT NULL as manager_assigned,
  
  -- Reporting
  (SELECT name FROM employees mgr WHERE mgr.id = employees.reporting_manager_id) as reports_to
  
FROM employees
WHERE email = 'employee@test.com';

-- =====================================================
-- EXPECTED RESULT:
-- =====================================================
-- name = 'Michael Brown'
-- onboarding_status = 'COMPLETE'
-- admin_approval_status = 'APPROVED'
-- All fields populated
-- reports_to = 'Sarah Williams' (Manager)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ EMPLOYEE USER FULLY POPULATED                     ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Employee: Michael Brown (employee@test.com)';
  RAISE NOTICE '  ✅ Personal Info: Name, Phone, Address';
  RAISE NOTICE '  ✅ Banking Info: Bank Name, Account Type';
  RAISE NOTICE '  ✅ Employment Info: Position, Hourly Rate';
  RAISE NOTICE '  ✅ Onboarding Status: COMPLETE';
  RAISE NOTICE '  ✅ Admin Approval: APPROVED';
  RAISE NOTICE '  ✅ Reports To: Sarah Williams (Manager)';
  RAISE NOTICE '';
  RAISE NOTICE 'Login: employee@test.com / employee123456';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Employee can now skip onboarding and access dashboard';
  RAISE NOTICE '';
END $$;

