-- =====================================================
-- CHECK ROLE CONSTRAINT ON EMPLOYEES TABLE
-- =====================================================

-- See what the role check constraint expects
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.employees'::regclass
  AND conname LIKE '%role%';

-- Check existing role values in the table
SELECT DISTINCT role, COUNT(*) as count
FROM employees
GROUP BY role
ORDER BY role;

