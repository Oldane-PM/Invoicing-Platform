-- ============================================
-- SQL QUERIES TO VIEW DATA IN DATABASE
-- ============================================

-- 1. View all employees
SELECT * FROM employees ORDER BY created_at DESC;

-- 2. View employees with profile information
SELECT 
  id,
  name,
  email,
  role,
  address,
  state_parish,
  country,
  phone,
  hourly_rate,
  active_project,
  project_types,
  created_at,
  updated_at
FROM employees
ORDER BY created_at DESC;

-- 3. View all submissions
SELECT * FROM submissions ORDER BY submission_date DESC;

-- 4. View submissions with employee names
SELECT 
  s.id,
  s.submission_date,
  s.hours_submitted,
  s.overtime_hours,
  s.description,
  s.overtime_description,
  s.status,
  s.invoice_id,
  s.rejection_reason,
  s.created_at,
  e.name AS employee_name,
  e.email AS employee_email
FROM submissions s
LEFT JOIN employees e ON s.employee_id = e.id
ORDER BY s.submission_date DESC;

-- 5. View submissions by status
SELECT 
  status,
  COUNT(*) as count
FROM submissions
GROUP BY status
ORDER BY count DESC;

-- 6. View team members with employee and manager names
SELECT 
  tm.id,
  tm.contract_start,
  tm.contract_end,
  tm.project_name,
  e.name AS employee_name,
  e.email AS employee_email,
  m.name AS manager_name,
  m.email AS manager_email,
  p.name AS project_name
FROM team_members tm
LEFT JOIN employees e ON tm.employee_id = e.id
LEFT JOIN employees m ON tm.manager_id = m.id
LEFT JOIN projects p ON tm.project_id = p.id
ORDER BY tm.created_at DESC;

-- 7. View all notifications
SELECT * FROM notifications ORDER BY created_at DESC;

-- 8. View unread notifications
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  e.name AS employee_name
FROM notifications n
LEFT JOIN employees e ON n.employee_id = e.id
WHERE n.is_read = false
ORDER BY n.created_at DESC;

-- 9. View all projects
SELECT * FROM projects ORDER BY created_at DESC;

-- 10. View all invoices
SELECT * FROM invoices ORDER BY created_at DESC;

-- 11. View invoices with submission details
SELECT 
  i.id,
  i.invoice_number,
  i.date,
  i.total,
  i.from_name,
  i.bill_to_company,
  s.submission_date,
  s.hours_submitted,
  s.overtime_hours,
  e.name AS employee_name
FROM invoices i
LEFT JOIN submissions s ON i.submission_id = s.id
LEFT JOIN employees e ON s.employee_id = e.id
ORDER BY i.created_at DESC;

-- 12. View manager's team submissions (for a specific manager)
-- Replace 'MANAGER_ID_HERE' with actual manager ID
SELECT 
  s.id,
  s.submission_date,
  s.hours_submitted,
  s.overtime_hours,
  s.status,
  e.name AS employee_name,
  e.email AS employee_email
FROM submissions s
INNER JOIN team_members tm ON s.employee_id = tm.employee_id
LEFT JOIN employees e ON s.employee_id = e.id
WHERE tm.manager_id = 'MANAGER_ID_HERE'
ORDER BY s.submission_date DESC;

-- 13. View employee submissions (for a specific employee)
-- Replace 'EMPLOYEE_ID_HERE' with actual employee ID
SELECT 
  s.id,
  s.submission_date,
  s.hours_submitted,
  s.overtime_hours,
  s.description,
  s.status,
  s.invoice_id,
  s.created_at
FROM submissions s
WHERE s.employee_id = 'EMPLOYEE_ID_HERE'
ORDER BY s.submission_date DESC;

-- 14. View employees by role
SELECT 
  role,
  COUNT(*) as count
FROM employees
GROUP BY role
ORDER BY count DESC;

-- 15. View summary statistics
SELECT 
  (SELECT COUNT(*) FROM employees) AS total_employees,
  (SELECT COUNT(*) FROM employees WHERE role = 'employee') AS total_employees_role,
  (SELECT COUNT(*) FROM employees WHERE role = 'manager') AS total_managers,
  (SELECT COUNT(*) FROM employees WHERE role = 'admin') AS total_admins,
  (SELECT COUNT(*) FROM submissions) AS total_submissions,
  (SELECT COUNT(*) FROM submissions WHERE status = 'submitted') AS pending_submissions,
  (SELECT COUNT(*) FROM submissions WHERE status = 'approved') AS approved_submissions,
  (SELECT COUNT(*) FROM team_members) AS total_team_memberships,
  (SELECT COUNT(*) FROM notifications WHERE is_read = false) AS unread_notifications,
  (SELECT COUNT(*) FROM invoices) AS total_invoices;

-- 16. View employees with incomplete profiles
SELECT 
  id,
  name,
  email,
  CASE 
    WHEN hourly_rate IS NULL OR hourly_rate = 0 THEN 'Missing hourly rate'
    WHEN address IS NULL OR address = '' THEN 'Missing address'
    WHEN bank_name IS NULL OR bank_name = '' THEN 'Missing banking info'
    ELSE 'Complete'
  END AS profile_status
FROM employees
WHERE hourly_rate IS NULL 
   OR hourly_rate = 0 
   OR address IS NULL 
   OR address = ''
   OR bank_name IS NULL 
   OR bank_name = '';

-- 17. View recent activity (last 10 submissions)
SELECT 
  s.id,
  s.submission_date,
  s.hours_submitted,
  s.status,
  e.name AS employee_name,
  s.created_at
FROM submissions s
LEFT JOIN employees e ON s.employee_id = e.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 18. View invoices with total amounts
SELECT 
  invoice_number,
  from_name,
  bill_to_company,
  total,
  date,
  created_at
FROM invoices
ORDER BY total DESC;

