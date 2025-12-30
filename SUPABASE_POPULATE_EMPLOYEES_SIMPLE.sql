-- =====================================================
-- SIMPLE EMPLOYEE DATA POPULATION
-- =====================================================
-- Updates one field at a time to avoid failures
-- =====================================================

-- =====================================================
-- ADMIN: John Anderson
-- =====================================================

-- Personal Info
UPDATE employees SET address = '123 Executive Drive, Suite 500' WHERE email = 'admin@test.com';
UPDATE employees SET state_parish = 'St. Andrew' WHERE email = 'admin@test.com';
UPDATE employees SET country = 'Jamaica' WHERE email = 'admin@test.com';
UPDATE employees SET zip_postal_code = '10001' WHERE email = 'admin@test.com';
UPDATE employees SET zip_code = '10001' WHERE email = 'admin@test.com';
UPDATE employees SET phone = '(876) 555-1001' WHERE email = 'admin@test.com';

-- Banking Info
UPDATE employees SET bank_name = 'National Commercial Bank Jamaica' WHERE email = 'admin@test.com';
UPDATE employees SET bank_address = '32 Trafalgar Road, Kingston 10, Jamaica' WHERE email = 'admin@test.com';
UPDATE employees SET swift_code = 'NCBMJMKX' WHERE email = 'admin@test.com';
UPDATE employees SET aba_wire_routing = '021000021' WHERE email = 'admin@test.com';
UPDATE employees SET account_type = 'Checking' WHERE email = 'admin@test.com';
UPDATE employees SET currency = 'JMD' WHERE email = 'admin@test.com';
UPDATE employees SET account_number = '****7890' WHERE email = 'admin@test.com';

-- Employment Details
UPDATE employees SET hourly_rate = 85.00 WHERE email = 'admin@test.com';
UPDATE employees SET position = 'Chief Operating Officer' WHERE email = 'admin@test.com';
UPDATE employees SET department = 'Executive' WHERE email = 'admin@test.com';
UPDATE employees SET contract_type = 'Permanent' WHERE email = 'admin@test.com';
UPDATE employees SET rate_type = 'hourly' WHERE email = 'admin@test.com';
UPDATE employees SET contract_start_date = '2020-01-15' WHERE email = 'admin@test.com';

-- Onboarding Status
UPDATE employees SET onboarding_status = 'COMPLETE' WHERE email = 'admin@test.com';
UPDATE employees SET admin_approval_status = 'APPROVED' WHERE email = 'admin@test.com';

-- =====================================================
-- MANAGER: Sarah Williams
-- =====================================================

-- Personal Info
UPDATE employees SET address = '456 Management Lane, Apt 22' WHERE email = 'manager@test.com';
UPDATE employees SET state_parish = 'St. James' WHERE email = 'manager@test.com';
UPDATE employees SET country = 'Jamaica' WHERE email = 'manager@test.com';
UPDATE employees SET zip_postal_code = '20002' WHERE email = 'manager@test.com';
UPDATE employees SET zip_code = '20002' WHERE email = 'manager@test.com';
UPDATE employees SET phone = '(876) 555-2002' WHERE email = 'manager@test.com';

-- Banking Info
UPDATE employees SET bank_name = 'Scotiabank Jamaica' WHERE email = 'manager@test.com';
UPDATE employees SET bank_address = '2 Knutsford Boulevard, Kingston 5, Jamaica' WHERE email = 'manager@test.com';
UPDATE employees SET swift_code = 'NOSCJMKN' WHERE email = 'manager@test.com';
UPDATE employees SET aba_wire_routing = '026009593' WHERE email = 'manager@test.com';
UPDATE employees SET account_type = 'Savings' WHERE email = 'manager@test.com';
UPDATE employees SET currency = 'USD' WHERE email = 'manager@test.com';
UPDATE employees SET account_number = '****8901' WHERE email = 'manager@test.com';

-- Employment Details
UPDATE employees SET hourly_rate = 65.00 WHERE email = 'manager@test.com';
UPDATE employees SET position = 'Project Manager' WHERE email = 'manager@test.com';
UPDATE employees SET department = 'Operations' WHERE email = 'manager@test.com';
UPDATE employees SET contract_type = 'Permanent' WHERE email = 'manager@test.com';
UPDATE employees SET rate_type = 'hourly' WHERE email = 'manager@test.com';
UPDATE employees SET contract_start_date = '2021-03-10' WHERE email = 'manager@test.com';
UPDATE employees SET reporting_manager_id = (SELECT id FROM employees WHERE email = 'admin@test.com') WHERE email = 'manager@test.com';

-- Onboarding Status
UPDATE employees SET onboarding_status = 'COMPLETE' WHERE email = 'manager@test.com';
UPDATE employees SET admin_approval_status = 'APPROVED' WHERE email = 'manager@test.com';

-- =====================================================
-- EMPLOYEE: Michael Brown
-- =====================================================

-- Personal Info
UPDATE employees SET address = '789 Worker Street' WHERE email = 'employee@test.com';
UPDATE employees SET state_parish = 'St. Ann' WHERE email = 'employee@test.com';
UPDATE employees SET country = 'Jamaica' WHERE email = 'employee@test.com';
UPDATE employees SET zip_postal_code = '30003' WHERE email = 'employee@test.com';
UPDATE employees SET zip_code = '30003' WHERE email = 'employee@test.com';
UPDATE employees SET phone = '(876) 555-3003' WHERE email = 'employee@test.com';

-- Banking Info
UPDATE employees SET bank_name = 'Jamaica National Bank' WHERE email = 'employee@test.com';
UPDATE employees SET bank_address = '4 Ocean Boulevard, Kingston 1, Jamaica' WHERE email = 'employee@test.com';
UPDATE employees SET swift_code = 'JNCBJMKX' WHERE email = 'employee@test.com';
UPDATE employees SET aba_wire_routing = '031176110' WHERE email = 'employee@test.com';
UPDATE employees SET account_type = 'Checking' WHERE email = 'employee@test.com';
UPDATE employees SET currency = 'JMD' WHERE email = 'employee@test.com';
UPDATE employees SET account_number = '****9012' WHERE email = 'employee@test.com';

-- Employment Details
UPDATE employees SET hourly_rate = 45.00 WHERE email = 'employee@test.com';
UPDATE employees SET position = 'Software Developer' WHERE email = 'employee@test.com';
UPDATE employees SET department = 'Engineering' WHERE email = 'employee@test.com';
UPDATE employees SET contract_type = 'Permanent' WHERE email = 'employee@test.com';
UPDATE employees SET rate_type = 'hourly' WHERE email = 'employee@test.com';
UPDATE employees SET contract_start_date = '2022-06-01' WHERE email = 'employee@test.com';
UPDATE employees SET reporting_manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com') WHERE email = 'employee@test.com';
UPDATE employees SET manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com') WHERE email = 'employee@test.com';

-- Onboarding Status
UPDATE employees SET onboarding_status = 'COMPLETE' WHERE email = 'employee@test.com';
UPDATE employees SET admin_approval_status = 'APPROVED' WHERE email = 'employee@test.com';

-- =====================================================
-- VERIFY RESULTS
-- =====================================================

SELECT 
  name,
  email,
  role,
  status,
  address,
  phone,
  bank_name,
  account_type,
  position,
  hourly_rate,
  onboarding_status
FROM employees
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY 
  CASE role 
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
  RAISE NOTICE '║  ✅ EMPLOYEE DATA POPULATED                          ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ All 3 employees updated with:';
  RAISE NOTICE '   - Personal info (address, phone, location)';
  RAISE NOTICE '   - Banking details (bank, account, SWIFT)';
  RAISE NOTICE '   - Employment info (position, department, rate)';
  RAISE NOTICE '   - Onboarding status (COMPLETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Check the query results above to verify!';
  RAISE NOTICE '';
END $$;

