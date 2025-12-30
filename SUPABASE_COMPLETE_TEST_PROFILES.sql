-- =====================================================
-- COMPLETE TEST USER PROFILES
-- =====================================================
-- Populates ALL fields for admin, manager, and employee
-- with realistic, complete test data
-- =====================================================

-- =====================================================
-- STEP 1: Update Admin Profile (admin@test.com)
-- =====================================================

-- Update only fields that exist in employees table
UPDATE employees 
SET
  name = 'John Anderson',
  email = 'admin@test.com',
  role = 'admin',  -- lowercase
  status = 'active',
  updated_at = now()
WHERE email = 'admin@test.com';

-- =====================================================
-- STEP 2: Update Manager Profile (manager@test.com)
-- =====================================================

-- Update only fields that exist in employees table
UPDATE employees 
SET
  name = 'Sarah Williams',
  email = 'manager@test.com',
  role = 'manager',  -- lowercase
  status = 'active',
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  updated_at = now()
WHERE email = 'manager@test.com';

-- =====================================================
-- STEP 3: Update Employee Profile (employee@test.com)
-- =====================================================

-- Update only fields that exist in employees table
UPDATE employees 
SET
  name = 'Michael Brown',
  email = 'employee@test.com',
  role = 'employee',  -- lowercase
  status = 'active',
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com'),
  updated_at = now()
WHERE email = 'employee@test.com';

-- =====================================================
-- STEP 4: Create Complete Onboarding Records
-- =====================================================

-- Admin's completed onboarding
INSERT INTO onboarding_personal (
  case_id,
  full_name,
  date_of_birth,
  address,
  city,
  state_parish,
  country,
  zip_code,
  phone,
  email,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'John Anderson',
  '1985-03-15',
  '123 Executive Drive',
  'Kingston',
  'St. Andrew',
  'Jamaica',
  '10001',
  '(876) 555-1001',
  'admin@test.com',
  '2020-01-15 10:00:00',
  '2020-01-15 09:00:00',
  '2020-01-15 10:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'admin@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state_parish = EXCLUDED.state_parish,
  country = EXCLUDED.country,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

INSERT INTO onboarding_banking (
  case_id,
  bank_name,
  bank_address,
  swift_code,
  aba_wire_routing,
  account_type,
  currency,
  account_number_encrypted,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'National Commercial Bank Jamaica',
  '32 Trafalgar Road, Kingston',
  'NCBMJMKX',
  '021000021',
  'Checking',
  'JMD',
  '1234567890',
  '2020-01-15 11:00:00',
  '2020-01-15 10:30:00',
  '2020-01-15 11:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'admin@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_address = EXCLUDED.bank_address,
  swift_code = EXCLUDED.swift_code,
  aba_wire_routing = EXCLUDED.aba_wire_routing,
  account_type = EXCLUDED.account_type,
  currency = EXCLUDED.currency,
  account_number_encrypted = EXCLUDED.account_number_encrypted,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

-- Manager's completed onboarding
INSERT INTO onboarding_personal (
  case_id,
  full_name,
  date_of_birth,
  address,
  city,
  state_parish,
  country,
  zip_code,
  phone,
  email,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'Sarah Williams',
  '1988-07-22',
  '456 Management Lane',
  'Montego Bay',
  'St. James',
  'Jamaica',
  '20002',
  '(876) 555-2002',
  'manager@test.com',
  '2021-03-10 10:00:00',
  '2021-03-10 09:00:00',
  '2021-03-10 10:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'manager@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state_parish = EXCLUDED.state_parish,
  country = EXCLUDED.country,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

INSERT INTO onboarding_banking (
  case_id,
  bank_name,
  bank_address,
  swift_code,
  aba_wire_routing,
  account_type,
  currency,
  account_number_encrypted,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'Scotiabank Jamaica',
  '2 Knutsford Boulevard, Kingston',
  'NOSCJMKN',
  '026009593',
  'Savings',
  'USD',
  '2345678901',
  '2021-03-10 11:00:00',
  '2021-03-10 10:30:00',
  '2021-03-10 11:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'manager@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_address = EXCLUDED.bank_address,
  swift_code = EXCLUDED.swift_code,
  aba_wire_routing = EXCLUDED.aba_wire_routing,
  account_type = EXCLUDED.account_type,
  currency = EXCLUDED.currency,
  account_number_encrypted = EXCLUDED.account_number_encrypted,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

-- Employee's completed onboarding
INSERT INTO onboarding_personal (
  case_id,
  full_name,
  date_of_birth,
  address,
  city,
  state_parish,
  country,
  zip_code,
  phone,
  email,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'Michael Brown',
  '1992-11-08',
  '789 Worker Street',
  'Ocho Rios',
  'St. Ann',
  'Jamaica',
  '30003',
  '(876) 555-3003',
  'employee@test.com',
  '2022-06-01 10:00:00',
  '2022-06-01 09:00:00',
  '2022-06-01 10:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'employee@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state_parish = EXCLUDED.state_parish,
  country = EXCLUDED.country,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

INSERT INTO onboarding_banking (
  case_id,
  bank_name,
  bank_address,
  swift_code,
  aba_wire_routing,
  account_type,
  currency,
  account_number_encrypted,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  oc.id,
  'Jamaica National Bank',
  '4 Ocean Boulevard, Kingston',
  'JNCBJMKX',
  '031176110',
  'Checking',
  'JMD',
  '3456789012',
  '2022-06-01 11:00:00',
  '2022-06-01 10:30:00',
  '2022-06-01 11:00:00'
FROM onboarding_cases oc
JOIN auth.users u ON u.id = oc.user_id
WHERE u.email = 'employee@test.com'
ON CONFLICT (case_id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_address = EXCLUDED.bank_address,
  swift_code = EXCLUDED.swift_code,
  aba_wire_routing = EXCLUDED.aba_wire_routing,
  account_type = EXCLUDED.account_type,
  currency = EXCLUDED.currency,
  account_number_encrypted = EXCLUDED.account_number_encrypted,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

-- =====================================================
-- STEP 5: Update Onboarding Cases to Approved
-- =====================================================

-- Admin onboarding (approved in 2020)
UPDATE onboarding_cases oc
SET 
  current_state = 'approved',
  submitted_at = '2020-01-15 10:00:00'::timestamptz,
  approved_at = '2020-01-15 11:00:00'::timestamptz,
  updated_at = now()
FROM auth.users u
WHERE u.id = oc.user_id
  AND u.email = 'admin@test.com';

-- Manager onboarding (approved in 2021)
UPDATE onboarding_cases oc
SET 
  current_state = 'approved',
  submitted_at = '2021-03-10 10:00:00'::timestamptz,
  approved_at = '2021-03-10 11:00:00'::timestamptz,
  updated_at = now()
FROM auth.users u
WHERE u.id = oc.user_id
  AND u.email = 'manager@test.com';

-- Employee onboarding (approved in 2022)
UPDATE onboarding_cases oc
SET 
  current_state = 'approved',
  submitted_at = '2022-06-01 10:00:00'::timestamptz,
  approved_at = '2022-06-01 11:00:00'::timestamptz,
  updated_at = now()
FROM auth.users u
WHERE u.id = oc.user_id
  AND u.email = 'employee@test.com';

-- =====================================================
-- STEP 6: Verify Complete Profiles
-- =====================================================

SELECT 
  e.name,
  e.email,
  e.role,
  e.status,
  manager.name as reports_to,
  oc.current_state as onboarding_status,
  op.full_name as personal_name,
  op.city as location,
  ob.bank_name,
  ob.account_type
FROM employees e
LEFT JOIN employees manager ON manager.id = e.reporting_manager_id
LEFT JOIN onboarding_cases oc ON oc.user_id = e.user_id
LEFT JOIN onboarding_personal op ON op.case_id = oc.id
LEFT JOIN onboarding_banking ob ON ob.case_id = oc.id
WHERE e.email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY 
  CASE e.role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'employee' THEN 3 
  END;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ COMPLETE TEST PROFILES CREATED                   ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Admin: John Anderson';
  RAISE NOTICE '   - Role: admin';
  RAISE NOTICE '   - Email: admin@test.com';
  RAISE NOTICE '   - Location: Kingston, Jamaica';
  RAISE NOTICE '   - Bank: NCB Jamaica';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Manager: Sarah Williams';
  RAISE NOTICE '   - Role: manager';
  RAISE NOTICE '   - Email: manager@test.com';
  RAISE NOTICE '   - Location: Montego Bay, Jamaica';
  RAISE NOTICE '   - Bank: Scotiabank';
  RAISE NOTICE '   - Reports to: John Anderson';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Employee: Michael Brown';
  RAISE NOTICE '   - Role: employee';
  RAISE NOTICE '   - Email: employee@test.com';
  RAISE NOTICE '   - Location: Ocho Rios, Jamaica';
  RAISE NOTICE '   - Bank: JN Bank';
  RAISE NOTICE '   - Reports to: Sarah Williams';
  RAISE NOTICE '';
  RAISE NOTICE '📋 All profiles include:';
  RAISE NOTICE '   ✅ Employee records (name, role, status)';
  RAISE NOTICE '   ✅ Personal info in onboarding_personal (DOB, address, phone)';
  RAISE NOTICE '   ✅ Banking info in onboarding_banking (bank, account, SWIFT, routing)';
  RAISE NOTICE '   ✅ Onboarding records (approved status)';
  RAISE NOTICE '   ✅ Reporting structure (manager hierarchy)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Test credentials:';
  RAISE NOTICE '   admin@test.com / admin123456';
  RAISE NOTICE '   manager@test.com / manager123456';
  RAISE NOTICE '   employee@test.com / employee123456';
  RAISE NOTICE '';
END $$;

