-- ========================================
-- SYNC REPORTING MANAGERS FROM TEAM_MEMBERS TO EMPLOYEES
-- ========================================
-- This script copies manager assignments from team_members.manager_id
-- to employees.reporting_manager_id (the new single source of truth)

-- ========================================
-- Step 1: Check current state
-- ========================================
SELECT 
  '📊 Current Manager Assignment Status' AS info;

-- Show employees with mismatched manager data
SELECT 
  e.id,
  e.name AS employee_name,
  e.email,
  e.reporting_manager_id AS current_manager_in_employees,
  tm.manager_id AS manager_in_team_members,
  m.name AS team_members_manager_name,
  CASE 
    WHEN e.reporting_manager_id IS NULL AND tm.manager_id IS NOT NULL 
    THEN '⚠️ NEEDS SYNC'
    WHEN e.reporting_manager_id = tm.manager_id 
    THEN '✅ IN SYNC'
    WHEN e.reporting_manager_id IS NOT NULL AND tm.manager_id IS NULL
    THEN '✅ ALREADY SET IN EMPLOYEES'
    ELSE '❓ MISMATCH'
  END AS sync_status
FROM employees e
LEFT JOIN LATERAL (
  SELECT manager_id
  FROM team_members
  WHERE team_members.employee_id = e.id
  ORDER BY created_at DESC
  LIMIT 1
) tm ON true
LEFT JOIN employees m ON m.id = tm.manager_id
ORDER BY e.name;

-- ========================================
-- Step 2: Sync managers from team_members to employees
-- ========================================
-- This will copy manager_id from team_members to reporting_manager_id in employees
-- Only updates employees where reporting_manager_id is NULL

WITH latest_team_assignments AS (
  SELECT DISTINCT ON (employee_id)
    employee_id,
    manager_id
  FROM team_members
  ORDER BY employee_id, created_at DESC
)
UPDATE employees e
SET 
  reporting_manager_id = lta.manager_id,
  updated_at = NOW()
FROM latest_team_assignments lta
WHERE e.id = lta.employee_id
  AND e.reporting_manager_id IS NULL  -- Only update if not already set
  AND lta.manager_id IS NOT NULL
RETURNING 
  e.id,
  e.name AS employee_name,
  e.reporting_manager_id AS new_manager_id,
  (SELECT name FROM employees WHERE id = e.reporting_manager_id) AS manager_name;

-- ========================================
-- Step 3: Verify sync completed
-- ========================================
SELECT 
  '✅ Sync Complete - Current Status:' AS info;

-- Show all employees with their reporting manager
SELECT 
  e.id,
  e.name AS employee_name,
  e.email,
  e.role,
  e.reporting_manager_id,
  m.name AS reporting_manager_name,
  CASE 
    WHEN e.reporting_manager_id IS NOT NULL THEN '✅ Manager Assigned'
    WHEN e.role = 'employee' THEN '⚠️ No Manager (Required for Employee role)'
    ELSE '✓ No Manager (Not required for ' || e.role || ' role)'
  END AS manager_status
FROM employees e
LEFT JOIN employees m ON m.id = e.reporting_manager_id
ORDER BY e.name;

-- ========================================
-- Step 4: Show manager assignments summary
-- ========================================
SELECT 
  '📊 Summary:' AS info;

SELECT 
  COUNT(*) FILTER (WHERE reporting_manager_id IS NOT NULL) AS employees_with_manager,
  COUNT(*) FILTER (WHERE reporting_manager_id IS NULL AND role = 'employee') AS employees_needing_manager,
  COUNT(*) FILTER (WHERE role IN ('admin', 'manager')) AS admins_and_managers,
  COUNT(*) AS total_employees
FROM employees;

-- ========================================
-- ✅ DONE!
-- ========================================
-- After running this script:
-- 1. Refresh your browser
-- 2. Open the employee drawer
-- 3. Both Contract Info and Access Control tabs should now show the same manager!

