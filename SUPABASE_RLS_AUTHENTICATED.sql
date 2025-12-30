-- =====================================================
-- RLS POLICIES FOR SUPABASE AUTH (authenticated users)
-- =====================================================
-- This script implements proper RLS policies for users with
-- real Supabase Auth sessions (auth.uid() returns actual user ID)
--
-- Run this INSTEAD of SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql
-- =====================================================

-- =====================================================
-- STEP 1: Ensure RLS is enabled
-- =====================================================

ALTER TABLE public.onboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Add unique constraint (one case per user)
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_cases_user_id_key
  ON public.onboarding_cases (user_id);

-- =====================================================
-- STEP 3: onboarding_cases policies
-- =====================================================

-- Drop existing policies (clean slate)
DROP POLICY IF EXISTS "Allow anon full access to onboarding_cases" ON public.onboarding_cases;
DROP POLICY IF EXISTS "Employees can view own onboarding case" ON public.onboarding_cases;
DROP POLICY IF EXISTS "Employees can create own onboarding case" ON public.onboarding_cases;
DROP POLICY IF EXISTS "Employees can update own onboarding case" ON public.onboarding_cases;
DROP POLICY IF EXISTS "Admins can view all onboarding cases" ON public.onboarding_cases;
DROP POLICY IF EXISTS "Admins can update all onboarding cases" ON public.onboarding_cases;
DROP POLICY IF EXISTS "onboarding_cases_select_own" ON public.onboarding_cases;
DROP POLICY IF EXISTS "onboarding_cases_insert_own" ON public.onboarding_cases;
DROP POLICY IF EXISTS "onboarding_cases_update_own" ON public.onboarding_cases;

-- SELECT: Authenticated users can view their own case
CREATE POLICY "onboarding_cases_select_own"
  ON public.onboarding_cases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Authenticated users can create their own case
CREATE POLICY "onboarding_cases_insert_own"
  ON public.onboarding_cases
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Authenticated users can update their own case
CREATE POLICY "onboarding_cases_update_own"
  ON public.onboarding_cases
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all cases
CREATE POLICY "Admins can view all onboarding cases"
  ON public.onboarding_cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- Admins can update all cases
CREATE POLICY "Admins can update all onboarding cases"
  ON public.onboarding_cases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- =====================================================
-- STEP 4: onboarding_personal policies
-- =====================================================

DROP POLICY IF EXISTS "Allow anon full access to onboarding_personal" ON public.onboarding_personal;
DROP POLICY IF EXISTS "Employees can manage own personal info" ON public.onboarding_personal;
DROP POLICY IF EXISTS "Admins can view all personal info" ON public.onboarding_personal;

-- Employees can manage their own personal info
CREATE POLICY "Employees can manage own personal info"
  ON public.onboarding_personal
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_personal.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can view all personal info
CREATE POLICY "Admins can view all personal info"
  ON public.onboarding_personal
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- =====================================================
-- STEP 5: onboarding_banking policies
-- =====================================================

DROP POLICY IF EXISTS "Allow anon full access to onboarding_banking" ON public.onboarding_banking;
DROP POLICY IF EXISTS "Employees can manage own banking info" ON public.onboarding_banking;
DROP POLICY IF EXISTS "Admins can view all banking info" ON public.onboarding_banking;

-- Employees can manage their own banking info
CREATE POLICY "Employees can manage own banking info"
  ON public.onboarding_banking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_banking.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can view all banking info
CREATE POLICY "Admins can view all banking info"
  ON public.onboarding_banking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- =====================================================
-- STEP 6: onboarding_contract policies
-- =====================================================

DROP POLICY IF EXISTS "Allow anon full access to onboarding_contract" ON public.onboarding_contract;
DROP POLICY IF EXISTS "Employees can view own contract" ON public.onboarding_contract;
DROP POLICY IF EXISTS "Admins can manage all contracts" ON public.onboarding_contract;

-- Employees can view their own contract
CREATE POLICY "Employees can view own contract"
  ON public.onboarding_contract
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_contract.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can manage all contracts
CREATE POLICY "Admins can manage all contracts"
  ON public.onboarding_contract
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- =====================================================
-- STEP 7: onboarding_events policies
-- =====================================================

DROP POLICY IF EXISTS "Allow anon full access to onboarding_events" ON public.onboarding_events;
DROP POLICY IF EXISTS "Employees can insert own events" ON public.onboarding_events;
DROP POLICY IF EXISTS "Employees can view own events" ON public.onboarding_events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.onboarding_events;

-- Employees can view events for their own case
CREATE POLICY "Employees can view own events"
  ON public.onboarding_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_events.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Employees can insert events for their own case
CREATE POLICY "Employees can insert own events"
  ON public.onboarding_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_events.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.onboarding_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = auth.uid() 
        AND UPPER(role) = 'ADMIN'
    )
  );

-- =====================================================
-- STEP 8: employees table policies
-- =====================================================

-- Drop ALL existing employees policies (including from previous migrations)
DROP POLICY IF EXISTS "Allow anon full access to employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins have full access" ON public.employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update own employee record" ON public.employees;

-- ⚠️ IMPORTANT: Use simple policies to avoid circular dependency!
-- Recursive policies (checking employees table within employees policies)
-- cause "Database error querying schema" during Supabase Auth login

-- Allow all authenticated users to view employees
-- (Needed for app to fetch user data after login)
CREATE POLICY "Authenticated users can view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own record only
CREATE POLICY "Users can update own employee record"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: INSERT/DELETE should be handled via service role or admin API
-- to maintain data integrity

-- =====================================================
-- STEP 9: time_entries table (block until onboarding approved)
-- =====================================================

-- Check if time_entries table exists, adjust if yours is named differently
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'time_entries'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon full access to time_entries" ON public.time_entries';
    
    -- Only approved employees can submit hours
    EXECUTE '
      CREATE POLICY "Approved employees can manage own time entries"
        ON public.time_entries
        FOR ALL
        TO authenticated
        USING (
          user_id = auth.uid() AND
          EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid()
              AND e.status = ''active''
          )
        )
    ';
    
    RAISE NOTICE '✅ RLS policies applied to time_entries';
  ELSE
    RAISE NOTICE 'ℹ️  time_entries table not found, skipping';
  END IF;
END $$;

-- =====================================================
-- STEP 10: Verification
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('onboarding_cases', 'onboarding_personal', 'onboarding_banking', 
                    'onboarding_contract', 'onboarding_events', 'employees', 'time_entries')
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ RLS POLICIES CONFIGURED FOR SUPABASE AUTH        ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Authenticated users can:';
  RAISE NOTICE '   - INSERT their own onboarding case (user_id = auth.uid())';
  RAISE NOTICE '   - SELECT their own onboarding case';
  RAISE NOTICE '   - UPDATE their own onboarding case';
  RAISE NOTICE '   - Manage personal/banking info for their case';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Admins can:';
  RAISE NOTICE '   - View all onboarding cases';
  RAISE NOTICE '   - Update all onboarding cases';
  RAISE NOTICE '   - Manage contracts';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Timesheet submission:';
  RAISE NOTICE '   - Blocked until employee.status = ''active''';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Login with: admin@test.com / admin123456';
  RAISE NOTICE '   2. Click "Start Onboarding"';
  RAISE NOTICE '   3. No more 42501 errors!';
  RAISE NOTICE '';
END $$;

