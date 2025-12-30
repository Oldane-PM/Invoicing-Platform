-- =====================================================
-- TROUBLESHOOTING: Check Database State
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose issues
-- =====================================================

-- =====================================================
-- 1. Check if onboarding tables exist
-- =====================================================

SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('onboarding_cases'),
    ('onboarding_personal'),
    ('onboarding_banking'),
    ('onboarding_contract'),
    ('onboarding_events'),
    ('employees')
) AS expected_tables(table_name)
ORDER BY table_name;

-- =====================================================
-- 2. Check if user_id column exists in employees
-- =====================================================

SELECT 
  'Employees Columns Check' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('id', 'user_id', 'status', 'role')
ORDER BY column_name;

-- =====================================================
-- 3. Check if RLS is enabled
-- =====================================================

SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'onboarding_cases',
    'onboarding_personal',
    'onboarding_banking',
    'onboarding_contract',
    'onboarding_events',
    'employees',
    'submissions'
  )
ORDER BY tablename;

-- =====================================================
-- 4. Check RLS policies on onboarding tables
-- =====================================================

SELECT 
  'RLS Policies' as check_type,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ HAS USING'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ HAS CHECK'
    ELSE 'No CHECK clause'
  END as check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'onboarding_cases',
    'onboarding_personal',
    'employees'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- 5. Check if is_admin() function exists
-- =====================================================

SELECT 
  'Functions Check' as check_type,
  proname as function_name,
  '✅ EXISTS' as status
FROM pg_proc
WHERE proname IN ('is_admin', 'approve_onboarding', 'reject_onboarding')
ORDER BY proname;

-- =====================================================
-- 6. List all auth users
-- =====================================================

SELECT 
  'Auth Users' as check_type,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- 7. List all employees and their user_id mapping
-- =====================================================

SELECT 
  'Employees' as check_type,
  e.id as employee_id,
  e.user_id,
  e.name,
  e.email,
  e.role,
  e.status,
  CASE 
    WHEN e.user_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ No user_id'
  END as auth_link
FROM employees e
ORDER BY e.created_at DESC;

-- =====================================================
-- 8. Check onboarding cases
-- =====================================================

SELECT 
  'Onboarding Cases' as check_type,
  oc.id as case_id,
  oc.user_id,
  oc.current_state,
  oc.submitted_at,
  au.email as user_email
FROM onboarding_cases oc
LEFT JOIN auth.users au ON au.id = oc.user_id
ORDER BY oc.created_at DESC;

-- =====================================================
-- 9. Test if current user can query employees
-- =====================================================

-- This will show if RLS is blocking or allowing
SELECT 
  'RLS Test - Employees' as check_type,
  COUNT(*) as visible_employees,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Can see employees'
    ELSE '⚠️ No employees visible (might be RLS blocking)'
  END as result
FROM employees;

-- =====================================================
-- 10. Test if current user can query onboarding_cases
-- =====================================================

SELECT 
  'RLS Test - Onboarding Cases' as check_type,
  COUNT(*) as visible_cases,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Can see cases'
    ELSE '⚠️ No cases visible (might be RLS blocking or no data)'
  END as result
FROM onboarding_cases;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 TROUBLESHOOTING COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Review the results above to identify issues:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Tables Check - All should show ✅ EXISTS';
  RAISE NOTICE '2. Employees Columns - Should have user_id, status, role';
  RAISE NOTICE '3. RLS Status - Should be ✅ ENABLED for all tables';
  RAISE NOTICE '4. RLS Policies - Should have policies defined';
  RAISE NOTICE '5. Functions Check - Should have is_admin, approve_onboarding, reject_onboarding';
  RAISE NOTICE '6. Auth Users - Should have test users';
  RAISE NOTICE '7. Employees - Should have user_id linked';
  RAISE NOTICE '8. Onboarding Cases - Check if any exist';
  RAISE NOTICE '9-10. RLS Tests - Check if queries work';
  RAISE NOTICE '==========================================';
END $$;

