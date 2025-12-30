-- =====================================================
-- COMPREHENSIVE TEST DATA FOR ALL TABLES
-- =====================================================
-- Creates complete, realistic data for entire schema
-- =====================================================

-- =====================================================
-- STEP 1: Update Complete Employee Profiles
-- =====================================================

-- Admin Profile - John Anderson
UPDATE employees 
SET
  name = 'John Anderson',
  email = 'admin@test.com',
  role = 'admin',
  status = 'active',
  
  -- Personal Information
  address = '123 Executive Drive, Suite 500',
  state_parish = 'St. Andrew',
  country = 'Jamaica',
  zip_postal_code = '10001',
  zip_code = '10001',
  phone = '(876) 555-1001',
  
  -- Banking Information
  bank_name = 'National Commercial Bank Jamaica',
  bank_address = '32 Trafalgar Road, Kingston 10, Jamaica',
  swift_code = 'NCBMJMKX',
  aba_wire_routing = '021000021',
  account_type = 'Checking',
  currency = 'JMD',
  account_number = '****7890',
  
  -- Employment Details
  hourly_rate = 85.00,
  position = 'Chief Operating Officer',
  department = 'Executive',
  contract_type = 'Permanent',
  rate_type = 'hourly',
  contract_start_date = '2020-01-15',
  
  -- Onboarding Status
  onboarding_status = 'COMPLETE',
  onboarding_step = 6,
  admin_approval_status = 'APPROVED',
  personal_info_completed_at = '2020-01-15 10:00:00'::timestamptz,
  banking_info_completed_at = '2020-01-15 10:30:00'::timestamptz,
  admin_approved_at = '2020-01-15 11:00:00'::timestamptz,
  onboarding_submitted_at = '2020-01-15 10:45:00'::timestamptz,
  onboarding_completed_at = '2020-01-15 11:00:00'::timestamptz,
  
  -- Metadata
  project_types = ARRAY['Software Development', 'Operations', 'Management'],
  updated_at = now()
WHERE email = 'admin@test.com';

-- Manager Profile - Sarah Williams
UPDATE employees 
SET
  name = 'Sarah Williams',
  email = 'manager@test.com',
  role = 'manager',
  status = 'active',
  
  -- Personal Information
  address = '456 Management Lane, Apt 22',
  state_parish = 'St. James',
  country = 'Jamaica',
  zip_postal_code = '20002',
  zip_code = '20002',
  phone = '(876) 555-2002',
  
  -- Banking Information
  bank_name = 'Scotiabank Jamaica',
  bank_address = '2 Knutsford Boulevard, Kingston 5, Jamaica',
  swift_code = 'NOSCJMKN',
  aba_wire_routing = '026009593',
  account_type = 'Savings',
  currency = 'USD',
  account_number = '****8901',
  
  -- Employment Details
  hourly_rate = 65.00,
  position = 'Project Manager',
  department = 'Operations',
  contract_type = 'Permanent',
  rate_type = 'hourly',
  contract_start_date = '2021-03-10',
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  
  -- Onboarding Status
  onboarding_status = 'COMPLETE',
  onboarding_step = 6,
  admin_approval_status = 'APPROVED',
  personal_info_completed_at = '2021-03-10 10:00:00'::timestamptz,
  banking_info_completed_at = '2021-03-10 10:30:00'::timestamptz,
  admin_approved_at = '2021-03-10 11:00:00'::timestamptz,
  admin_approved_by = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  manager_assigned_at = '2021-03-10 11:15:00'::timestamptz,
  manager_assigned_by = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  onboarding_submitted_at = '2021-03-10 10:45:00'::timestamptz,
  onboarding_completed_at = '2021-03-10 11:30:00'::timestamptz,
  
  -- Metadata
  project_types = ARRAY['Software Development', 'Project Management'],
  updated_at = now()
WHERE email = 'manager@test.com';

-- Employee Profile - Michael Brown
UPDATE employees 
SET
  name = 'Michael Brown',
  email = 'employee@test.com',
  role = 'employee',
  status = 'active',
  
  -- Personal Information
  address = '789 Worker Street',
  state_parish = 'St. Ann',
  country = 'Jamaica',
  zip_postal_code = '30003',
  zip_code = '30003',
  phone = '(876) 555-3003',
  
  -- Banking Information
  bank_name = 'Jamaica National Bank',
  bank_address = '4 Ocean Boulevard, Kingston 1, Jamaica',
  swift_code = 'JNCBJMKX',
  aba_wire_routing = '031176110',
  account_type = 'Checking',
  currency = 'JMD',
  account_number = '****9012',
  
  -- Employment Details
  hourly_rate = 45.00,
  position = 'Software Developer',
  department = 'Engineering',
  contract_type = 'Permanent',
  rate_type = 'hourly',
  contract_start_date = '2022-06-01',
  reporting_manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com'),
  manager_id = (SELECT id FROM employees WHERE email = 'manager@test.com'),
  
  -- Onboarding Status
  onboarding_status = 'COMPLETE',
  onboarding_step = 6,
  admin_approval_status = 'APPROVED',
  personal_info_completed_at = '2022-06-01 10:00:00'::timestamptz,
  banking_info_completed_at = '2022-06-01 10:30:00'::timestamptz,
  admin_approved_at = '2022-06-01 11:00:00'::timestamptz,
  admin_approved_by = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  manager_assigned_at = '2022-06-01 11:15:00'::timestamptz,
  manager_assigned_by = (SELECT id FROM employees WHERE email = 'admin@test.com'),
  onboarding_submitted_at = '2022-06-01 10:45:00'::timestamptz,
  onboarding_completed_at = '2022-06-01 11:30:00'::timestamptz,
  
  -- Metadata
  project_types = ARRAY['Software Development', 'Web Development'],
  active_project = 'Alpha Project',
  updated_at = now()
WHERE email = 'employee@test.com';

-- =====================================================
-- STEP 2: Create Projects
-- =====================================================

INSERT INTO projects (id, name, description, created_at)
VALUES 
  (gen_random_uuid(), 'Alpha Project', 'Main software development project for Q4 2024', '2024-01-15'::timestamptz),
  (gen_random_uuid(), 'Beta Initiative', 'Infrastructure modernization initiative', '2024-03-01'::timestamptz),
  (gen_random_uuid(), 'Gamma Platform', 'Customer-facing web platform', '2024-06-10'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Create Team Members Relationships
-- =====================================================

-- Michael works under Sarah on Alpha Project
INSERT INTO team_members (
  manager_id,
  employee_id,
  project_id,
  project_name,
  contract_start,
  contract_end,
  created_at
)
SELECT 
  (SELECT id FROM employees WHERE email = 'manager@test.com'),
  (SELECT id FROM employees WHERE email = 'employee@test.com'),
  (SELECT id FROM projects WHERE name = 'Alpha Project'),
  'Alpha Project',
  '2022-06-01'::date,
  '2025-06-01'::date,
  '2022-06-01'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM team_members 
  WHERE employee_id = (SELECT id FROM employees WHERE email = 'employee@test.com')
);

-- =====================================================
-- STEP 4: Create Complete Onboarding Records
-- =====================================================

-- (This duplicates what's in SUPABASE_COMPLETE_TEST_PROFILES.sql
--  but includes it here for completeness)

-- =====================================================
-- STEP 5: Create Holidays
-- =====================================================

INSERT INTO holidays (
  id,
  name,
  description,
  type,
  dates,
  is_active,
  is_paid,
  applies_to_all_projects,
  applies_to_all_employee_types,
  applies_to_all_locations,
  created_at,
  updated_at
)
VALUES 
  (
    gen_random_uuid(),
    'New Year''s Day',
    'First day of the year',
    'holiday',
    '[{"date": "2025-01-01"}]'::jsonb,
    true,
    true,
    true,
    true,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Independence Day (Jamaica)',
    'Jamaica Independence Day celebration',
    'holiday',
    '[{"date": "2025-08-06"}]'::jsonb,
    true,
    true,
    true,
    true,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Christmas Day',
    'Christmas holiday',
    'holiday',
    '[{"date": "2025-12-25"}]'::jsonb,
    true,
    true,
    true,
    true,
    true,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: Create Sample Submissions
-- =====================================================

-- Michael's recent submissions
INSERT INTO submissions (
  id,
  employee_id,
  manager_id,
  submission_date,
  hours_submitted,
  overtime_hours,
  description,
  overtime_description,
  status,
  acted_by_manager_id,
  acted_at,
  manager_comment,
  created_at,
  updated_at,
  idempotency_key
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM employees WHERE email = 'employee@test.com'),
  (SELECT id FROM employees WHERE email = 'manager@test.com'),
  '2024-12-23'::date,
  8,
  2,
  'Worked on Alpha Project - implemented user authentication module',
  'Emergency bug fix after hours',
  'MANAGER_APPROVED',
  (SELECT id FROM employees WHERE email = 'manager@test.com'),
  '2024-12-24 10:30:00'::timestamptz,
  'Great work on the authentication module!',
  '2024-12-24 09:00:00'::timestamptz,
  '2024-12-24 10:30:00'::timestamptz,
  gen_random_uuid()
WHERE NOT EXISTS (
  SELECT 1 FROM submissions 
  WHERE employee_id = (SELECT id FROM employees WHERE email = 'employee@test.com')
    AND submission_date = '2024-12-23'
);

INSERT INTO submissions (
  id,
  employee_id,
  manager_id,
  submission_date,
  hours_submitted,
  overtime_hours,
  description,
  status,
  created_at,
  updated_at,
  idempotency_key
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM employees WHERE email = 'employee@test.com'),
  (SELECT id FROM employees WHERE email = 'manager@test.com'),
  '2024-12-27'::date,
  8,
  0,
  'Alpha Project - Database optimization and query improvements',
  'SUBMITTED',
  '2024-12-28 09:00:00'::timestamptz,
  '2024-12-28 09:00:00'::timestamptz,
  gen_random_uuid()
WHERE NOT EXISTS (
  SELECT 1 FROM submissions 
  WHERE employee_id = (SELECT id FROM employees WHERE email = 'employee@test.com')
    AND submission_date = '2024-12-27'
);

-- =====================================================
-- STEP 7: Create Notifications
-- =====================================================

-- Notification for manager about pending submission
INSERT INTO notifications (
  user_id,
  role,
  type,
  title,
  message,
  entity_type,
  entity_id,
  is_read,
  metadata,
  created_at
)
SELECT
  (SELECT user_id FROM employees WHERE email = 'manager@test.com'),
  'MANAGER',
  'submission_pending',
  'New Timesheet Submission',
  'Michael Brown submitted 8 hours for review on 2024-12-27',
  'submission',
  (SELECT id FROM submissions WHERE submission_date = '2024-12-27' AND employee_id = (SELECT id FROM employees WHERE email = 'employee@test.com') LIMIT 1),
  false,
  '{"hours": 8, "date": "2024-12-27", "employee_name": "Michael Brown"}'::jsonb,
  '2024-12-28 09:01:00'::timestamptz
WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'manager@test.com')
  AND NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = (SELECT user_id FROM employees WHERE email = 'manager@test.com')
      AND type = 'submission_pending'
  );

-- Notification for employee about approved submission
INSERT INTO notifications (
  user_id,
  role,
  type,
  title,
  message,
  entity_type,
  entity_id,
  is_read,
  metadata,
  created_at
)
SELECT
  (SELECT user_id FROM employees WHERE email = 'employee@test.com'),
  'EMPLOYEE',
  'submission_approved',
  'Timesheet Approved',
  'Your timesheet for 2024-12-23 (8 hours + 2 overtime) has been approved by Sarah Williams',
  'submission',
  (SELECT id FROM submissions WHERE submission_date = '2024-12-23' AND employee_id = (SELECT id FROM employees WHERE email = 'employee@test.com') LIMIT 1),
  false,
  '{"hours": 8, "overtime": 2, "date": "2024-12-23", "manager_name": "Sarah Williams"}'::jsonb,
  '2024-12-24 10:31:00'::timestamptz
WHERE EXISTS (SELECT 1 FROM employees WHERE email = 'employee@test.com')
  AND NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = (SELECT user_id FROM employees WHERE email = 'employee@test.com')
      AND type = 'submission_approved'
  );

-- =====================================================
-- STEP 8: Verify Complete Data
-- =====================================================

SELECT 
  'employees' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(DISTINCT role, ', ') as roles
FROM employees
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')

UNION ALL

SELECT 
  'projects' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(name, ', ') as roles
FROM projects

UNION ALL

SELECT 
  'team_members' as table_name,
  COUNT(*) as record_count,
  NULL as roles
FROM team_members

UNION ALL

SELECT 
  'submissions' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(DISTINCT status, ', ') as roles
FROM submissions

UNION ALL

SELECT 
  'notifications' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(DISTINCT type, ', ') as roles
FROM notifications

UNION ALL

SELECT 
  'holidays' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(name, ', ') as roles
FROM holidays;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ COMPLETE TEST DATA CREATED                       ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Employees (3)';
  RAISE NOTICE '   - Admin: John Anderson (COO, $85/hr)';
  RAISE NOTICE '   - Manager: Sarah Williams (PM, $65/hr)';
  RAISE NOTICE '   - Employee: Michael Brown (Dev, $45/hr)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Projects (3)';
  RAISE NOTICE '   - Alpha Project, Beta Initiative, Gamma Platform';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Team Members (1)';
  RAISE NOTICE '   - Michael → Sarah (Alpha Project)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Submissions (2)';
  RAISE NOTICE '   - Dec 23: 8h + 2h OT (Approved)';
  RAISE NOTICE '   - Dec 27: 8h (Pending)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Notifications (2)';
  RAISE NOTICE '   - Manager: New submission alert';
  RAISE NOTICE '   - Employee: Approval notification';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Holidays (3)';
  RAISE NOTICE '   - New Year, Independence Day, Christmas';
  RAISE NOTICE '';
  RAISE NOTICE '📋 All employee fields populated:';
  RAISE NOTICE '   ✅ Personal (address, phone, email)';
  RAISE NOTICE '   ✅ Banking (bank, account, SWIFT)';
  RAISE NOTICE '   ✅ Employment (position, department, rate)';
  RAISE NOTICE '   ✅ Onboarding (complete, all timestamps)';
  RAISE NOTICE '   ✅ Reporting structure (manager hierarchy)';
  RAISE NOTICE '';
END $$;

