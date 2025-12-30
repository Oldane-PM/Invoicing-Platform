-- =====================================================
-- REMOVE ONBOARDING BLOCKS FROM HOUR SUBMISSION
-- =====================================================
-- This migration removes all onboarding-based restrictions
-- from timesheet submission. Hour submission now works for
-- all authenticated users (ownership enforced via RLS).
-- 
-- Onboarding status becomes advisory only (for UI banners).
-- =====================================================

-- =====================================================
-- 1. DROP RESTRICTIVE RLS POLICY ON SUBMISSIONS
-- =====================================================

-- Remove policy that requires employee.status = 'active'
DROP POLICY IF EXISTS "Active employees can create submissions" ON submissions;

-- =====================================================
-- 2. CREATE PERMISSIVE RLS POLICY (OWNERSHIP ONLY)
-- =====================================================

-- New policy: Allow authenticated users to submit their own hours
-- No onboarding or approval check - ownership is the only gate
CREATE POLICY "Employees can submit own hours"
  ON submissions FOR INSERT
  WITH CHECK (
    -- Ensure user can only submit for themselves
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Employees can submit own hours" ON submissions IS 
  'Allows any authenticated employee to submit hours (ownership enforced). 
   Onboarding status is advisory only, not restrictive.';

-- =====================================================
-- 3. VERIFY OTHER SUBMISSION POLICIES ARE PERMISSIVE
-- =====================================================

-- Ensure SELECT policy allows employees to view own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'submissions' 
    AND policyname = 'Employees can view own submissions'
  ) THEN
    CREATE POLICY "Employees can view own submissions"
      ON submissions FOR SELECT
      USING (
        employee_id IN (
          SELECT id FROM employees WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ensure UPDATE policy allows employees to update own pending submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'submissions' 
    AND policyname = 'Employees can update own pending submissions'
  ) THEN
    CREATE POLICY "Employees can update own pending submissions"
      ON submissions FOR UPDATE
      USING (
        employee_id IN (
          SELECT id FROM employees WHERE user_id = auth.uid()
        )
        AND status IN ('DRAFT', 'SUBMITTED')
      );
  END IF;
END $$;

-- =====================================================
-- 4. VERIFY RESULTS
-- =====================================================

-- Show all RLS policies on submissions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'submissions'
ORDER BY policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ ONBOARDING BLOCKS REMOVED FROM SUBMISSIONS        ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Removed restrictive RLS policy';
  RAISE NOTICE '✅ Created permissive ownership-based policy';
  RAISE NOTICE '✅ Employees can now submit hours regardless of onboarding status';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Onboarding status is now advisory only (UI banners)';
  RAISE NOTICE '🔒 Ownership still enforced (users can only submit own hours)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Test: Login as any employee → Submit Hours should work';
  RAISE NOTICE '';
END $$;

