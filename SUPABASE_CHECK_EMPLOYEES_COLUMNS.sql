-- =====================================================
-- CHECK WHAT COLUMNS EXIST IN EMPLOYEES TABLE
-- =====================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'employees'
ORDER BY ordinal_position;

-- Also show a sample record to see what fields have data
SELECT * FROM employees WHERE email = 'admin@test.com' LIMIT 1;

