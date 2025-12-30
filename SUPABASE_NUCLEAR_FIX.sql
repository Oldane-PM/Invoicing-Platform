-- =====================================================
-- NUCLEAR OPTION: Temporarily Disable RLS on Employees
-- =====================================================
-- This is a TEMPORARY fix to unblock auth while we debug
-- DO NOT use in production!
-- 
-- This will allow you to login and test the app
-- Once auth works, we can add back proper RLS policies
-- =====================================================

-- =====================================================
-- STEP 1: Disable RLS on employees table
-- =====================================================

ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Verify RLS is disabled
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'employees';
-- Should show rls_enabled = false

-- =====================================================
-- STEP 3: Check all policies (should show none active)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'employees';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ⚠️  NUCLEAR OPTION APPLIED                          ║';
  RAISE NOTICE '║  RLS DISABLED ON EMPLOYEES TABLE                     ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  This is TEMPORARY for debugging!';
  RAISE NOTICE '⚠️  DO NOT use in production!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Auth should work now';
  RAISE NOTICE '✅ You can login and test the app';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Run: npm run test:auth-smoke';
  RAISE NOTICE '   2. Try login in browser';
  RAISE NOTICE '   3. If it works, we can add back RLS properly';
  RAISE NOTICE '';
END $$;

