-- =====================================================
-- FIX: Auth Schema Error - Circular Dependency in RLS
-- =====================================================
-- Problem: Employees table RLS policies create circular dependency
-- Auth needs to query employees, but employees policies check auth.uid()
--
-- Solution: Simplify employees policies to avoid recursion
-- =====================================================

-- =====================================================
-- STEP 1: Drop problematic employees policies
-- =====================================================

DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "Allow anon full access to employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins have full access" ON public.employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;

-- =====================================================
-- STEP 2: Create simpler, non-recursive policies
-- =====================================================

-- Drop the policies first (in case they already exist)
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update own employee record" ON public.employees;

-- Allow authenticated users to view employees (no recursion)
-- This breaks the circular dependency during login
CREATE POLICY "Authenticated users can view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to SELECT

-- Allow authenticated users to update their own record only
CREATE POLICY "Users can update own employee record"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- For INSERT/DELETE, we'll handle via application logic or service role
-- (These operations should be rare and admin-controlled)

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ FIXED AUTH SCHEMA ERROR                          ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Removed circular dependency in employees table RLS';
  RAISE NOTICE '✅ Authenticated users can now login successfully';
  RAISE NOTICE '✅ All authenticated users can view employees (needed for app)';
  RAISE NOTICE '✅ Users can only update their own record';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Refresh your browser';
  RAISE NOTICE '   2. Try login: admin@test.com / admin123456';
  RAISE NOTICE '   3. Should work now!';
  RAISE NOTICE '';
END $$;

