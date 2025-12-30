-- =====================================================
-- CHECK ONBOARDING_STATUS CONSTRAINT
-- =====================================================

-- 1. Check what constraint exists on onboarding_status column
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'employees'::regclass
  AND conname LIKE '%onboarding_status%';

-- 2. Check if there's an enum type
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%onboarding%'
ORDER BY e.enumsortorder;

-- 3. Check column definition
SELECT 
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name = 'onboarding_status';

-- 4. Try to see what values currently exist
SELECT DISTINCT onboarding_status 
FROM employees
WHERE onboarding_status IS NOT NULL;

-- 5. Show current employee data
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

