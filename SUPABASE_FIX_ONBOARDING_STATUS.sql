-- =====================================================
-- FIX ONBOARDING STATUS TO COMPLETE
-- =====================================================

-- Update all 3 test users to COMPLETE
UPDATE employees 
SET onboarding_status = 'COMPLETE'
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com');

-- Verify
SELECT 
  name,
  email,
  role,
  onboarding_status,
  admin_approval_status
FROM employees
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY 
  CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'employee' THEN 3 
  END;

-- Should show COMPLETE for all 3

