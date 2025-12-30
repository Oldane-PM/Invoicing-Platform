-- =====================================================
-- CREATE APPROVED ONBOARDING CASE FOR EMPLOYEE
-- =====================================================
-- This creates an approved onboarding_cases record so
-- employee@test.com can submit timesheets immediately
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_case_id UUID;
  v_employee_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get the user_id and employee_id for employee@test.com
  SELECT user_id, id INTO v_user_id, v_employee_id
  FROM employees
  WHERE email = 'employee@test.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Employee user_id not found for employee@test.com';
  END IF;
  
  RAISE NOTICE 'Found user_id: %', v_user_id;
  RAISE NOTICE 'Found employee_id: %', v_employee_id;
  
  -- Get admin_id for reviewed_by
  SELECT id INTO v_admin_id
  FROM employees
  WHERE email = 'admin@test.com';
  
  RAISE NOTICE 'Found admin_id (reviewer): %', v_admin_id;
  
  -- Check if onboarding case already exists
  SELECT id INTO v_case_id
  FROM onboarding_cases
  WHERE user_id = v_user_id;
  
  IF v_case_id IS NOT NULL THEN
    RAISE NOTICE 'Onboarding case already exists: %, updating to approved', v_case_id;
    
    -- Update existing case to approved
    UPDATE onboarding_cases
    SET
      employee_id = v_employee_id,
      current_state = 'approved',
      submitted_at = '2024-01-12 12:00:00'::timestamptz,
      approved_at = '2024-01-12 13:00:00'::timestamptz,
      reviewed_by = v_admin_id,
      updated_at = NOW()
    WHERE id = v_case_id;
    
  ELSE
    RAISE NOTICE 'Creating new onboarding case';
    
    -- Create new approved onboarding case
    INSERT INTO onboarding_cases (
      user_id,
      employee_id,
      current_state,
      submitted_at,
      approved_at,
      reviewed_by,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_employee_id,
      'approved',
      '2024-01-12 12:00:00'::timestamptz,
      '2024-01-12 13:00:00'::timestamptz,
      v_admin_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_case_id;
    
    RAISE NOTICE 'Created onboarding case: %', v_case_id;
    
    -- Create onboarding event
    INSERT INTO onboarding_events (
      case_id,
      event_type,
      actor_user_id,
      payload,
      created_at
    ) VALUES (
      v_case_id,
      'admin_approved',
      v_user_id,
      '{"note": "Auto-approved for testing"}',
      NOW()
    );
    
    RAISE NOTICE 'Created approval event';
  END IF;
  
  -- Create or update onboarding_personal record
  INSERT INTO onboarding_personal (
    case_id,
    full_name,
    phone,
    address,
    completed_at,
    created_at,
    updated_at
  ) VALUES (
    v_case_id,
    'Michael Brown',
    '(876) 555-3003',
    '789 Worker Street, Kingston, Jamaica',
    '2024-01-12 10:00:00'::timestamptz,
    NOW(),
    NOW()
  )
  ON CONFLICT (case_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();
  
  RAISE NOTICE 'Created/updated personal info';
  
  -- Create or update onboarding_banking record
  INSERT INTO onboarding_banking (
    case_id,
    bank_name,
    account_type,
    completed_at,
    created_at,
    updated_at
  ) VALUES (
    v_case_id,
    'Jamaica National Bank',
    'Checking',
    '2024-01-12 11:00:00'::timestamptz,
    NOW(),
    NOW()
  )
  ON CONFLICT (case_id) DO UPDATE SET
    bank_name = EXCLUDED.bank_name,
    account_type = EXCLUDED.account_type,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();
  
  RAISE NOTICE 'Created/updated banking info';
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ EMPLOYEE ONBOARDING CASE CREATED/APPROVED         ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Employee: Michael Brown (employee@test.com)';
  RAISE NOTICE '  ✅ Onboarding Case: %', v_case_id;
  RAISE NOTICE '  ✅ Status: APPROVED';
  RAISE NOTICE '  ✅ Personal Info: Complete';
  RAISE NOTICE '  ✅ Banking Info: Complete';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Refresh browser - timesheet lock should be removed';
  RAISE NOTICE '';
  
END $$;

-- Verify the onboarding case
SELECT 
  oc.id as case_id,
  oc.user_id,
  oc.employee_id,
  e.name as employee_name,
  e.email,
  oc.current_state,
  oc.submitted_at,
  oc.approved_at,
  oc.reviewed_by,
  reviewer.name as reviewed_by_name,
  op.full_name as personal_name,
  op.completed_at as personal_completed,
  ob.bank_name,
  ob.completed_at as banking_completed
FROM onboarding_cases oc
JOIN employees e ON e.user_id = oc.user_id
LEFT JOIN employees reviewer ON reviewer.id = oc.reviewed_by
LEFT JOIN onboarding_personal op ON op.case_id = oc.id
LEFT JOIN onboarding_banking ob ON ob.case_id = oc.id
WHERE e.email = 'employee@test.com';

-- Expected: 
-- current_state = 'approved'
-- employee_id = [UUID] (not NULL)
-- reviewed_by = [UUID] (not NULL)
-- reviewed_by_name = 'John Anderson'
-- All fields populated

