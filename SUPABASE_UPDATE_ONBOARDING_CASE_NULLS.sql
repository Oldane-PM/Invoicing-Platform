-- =====================================================
-- UPDATE NULL COLUMNS IN ONBOARDING_CASES
-- =====================================================
-- This populates employee_id and reviewed_by columns
-- in onboarding_cases for employee@test.com
-- =====================================================

DO $$
DECLARE
  v_employee_id UUID;
  v_admin_id UUID;
  v_case_id UUID;
BEGIN
  -- Get employee ID for employee@test.com
  SELECT id INTO v_employee_id
  FROM employees
  WHERE email = 'employee@test.com';
  
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee record not found for employee@test.com';
  END IF;
  
  RAISE NOTICE 'Found employee_id: %', v_employee_id;
  
  -- Get admin ID for reviewed_by (admin@test.com)
  SELECT id INTO v_admin_id
  FROM employees
  WHERE email = 'admin@test.com';
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin record not found for admin@test.com';
  END IF;
  
  RAISE NOTICE 'Found admin_id (reviewer): %', v_admin_id;
  
  -- Update onboarding_cases with employee_id and reviewed_by
  UPDATE onboarding_cases
  SET
    employee_id = v_employee_id,
    reviewed_by = v_admin_id,
    updated_at = NOW()
  FROM employees e
  WHERE onboarding_cases.user_id = e.user_id
    AND e.email = 'employee@test.com'
  RETURNING onboarding_cases.id INTO v_case_id;
  
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'No onboarding case found to update for employee@test.com';
  END IF;
  
  RAISE NOTICE 'Updated onboarding case: %', v_case_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ ONBOARDING_CASES NULL COLUMNS UPDATED             ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated:';
  RAISE NOTICE '  ✅ employee_id = % (Michael Brown)', v_employee_id;
  RAISE NOTICE '  ✅ reviewed_by = % (Admin User)', v_admin_id;
  RAISE NOTICE '';
  
END $$;

-- Verify the update
SELECT 
  oc.id as case_id,
  oc.user_id,
  oc.employee_id,
  e.name as employee_name,
  e.email as employee_email,
  oc.current_state,
  oc.submitted_at,
  oc.approved_at,
  oc.reviewed_by,
  reviewer.name as reviewed_by_name,
  oc.created_at,
  oc.updated_at
FROM onboarding_cases oc
JOIN employees e ON e.user_id = oc.user_id
LEFT JOIN employees reviewer ON reviewer.id = oc.reviewed_by
WHERE e.email = 'employee@test.com';

-- Expected Result:
-- employee_id = [UUID] (not NULL)
-- reviewed_by = [UUID] (not NULL)
-- reviewed_by_name = 'John Anderson' (Admin)

