-- Quick check of all employees in the database
-- Run this in Supabase SQL Editor

SELECT 
  id,
  name,
  email,
  role,
  status,
  reporting_manager_id,
  created_at
FROM employees
ORDER BY created_at DESC;

-- If you need the test employee IDs:
-- admin@test.com: should be in auth.users
-- manager@test.com: should be in auth.users
-- employee@test.com: should be in auth.users

