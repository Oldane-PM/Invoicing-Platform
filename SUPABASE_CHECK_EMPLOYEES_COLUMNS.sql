-- =====================================================
-- CHECK WHAT COLUMNS EXIST IN EMPLOYEES TABLE
-- =====================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also show a sample record
SELECT * FROM employees WHERE email = 'admin@test.com' LIMIT 1;
