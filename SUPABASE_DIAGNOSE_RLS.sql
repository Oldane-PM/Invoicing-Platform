-- =====================================================
-- DIAGNOSE RLS ISSUES BLOCKING AUTH
-- =====================================================
-- Run this to see all RLS policies that might be
-- causing the "Database error querying schema" error
-- =====================================================

-- =====================================================
-- Check 1: Which tables have RLS enabled?
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- Check 2: All RLS policies (look for recursion)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- Check 3: Employees table policies (CRITICAL)
-- =====================================================

SELECT 
  policyname,
  cmd AS operation,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'employees';

-- Look for policies with 'employees' in the USING clause
-- Those are recursive and will block auth!

-- =====================================================
-- Check 4: Test if we can query employees as anon
-- =====================================================

-- This simulates what Supabase Auth tries to do during login
-- Run this as anon user (should fail if RLS is too strict)
SET ROLE anon;
SELECT COUNT(*) FROM employees;
-- If this fails, RLS is blocking auth service
RESET ROLE;

-- =====================================================
-- Check 5: Auth schema health
-- =====================================================

-- Check auth schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- Check auth.users exists
SELECT COUNT(*) as user_count 
FROM auth.users;

-- Check if test users exist
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email IN ('admin@test.com', 'employee@test.com', 'manager@test.com', 'new@test.com');

-- =====================================================
-- Check 6: Onboarding tables RLS
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename LIKE 'onboarding%'
ORDER BY tablename, policyname;

-- =====================================================
-- DIAGNOSIS SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  RLS DIAGNOSIS COMPLETE                               ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Review the results above:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Tables with RLS enabled';
  RAISE NOTICE '   → employees should be in the list';
  RAISE NOTICE '';
  RAISE NOTICE '2. All policies';
  RAISE NOTICE '   → Look for policies that query same table in USING clause';
  RAISE NOTICE '   → Example: employees policy checking employees table = BAD';
  RAISE NOTICE '';
  RAISE NOTICE '3. Employees policies';
  RAISE NOTICE '   → Should NOT contain "EXISTS (SELECT FROM employees"';
  RAISE NOTICE '';
  RAISE NOTICE '4. Anon user test';
  RAISE NOTICE '   → If count query failed, RLS is too strict';
  RAISE NOTICE '';
  RAISE NOTICE '5. Auth schema';
  RAISE NOTICE '   → Should show auth schema exists + test users';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   - If employees policies have recursion → Run SUPABASE_NUCLEAR_FIX.sql';
  RAISE NOTICE '   - If anon test failed → RLS too strict';
  RAISE NOTICE '   - If auth.users missing → Run SUPABASE_CLEAN_AND_SEED.sql';
  RAISE NOTICE '';
END $$;

