-- =====================================================
-- FIX RLS POLICIES FOR MOCK AUTH
-- =====================================================
-- Problem: App uses mock auth (localStorage), not Supabase Auth
-- So auth.uid() returns NULL and RLS blocks all queries
-- 
-- This script temporarily disables RLS on onboarding tables
-- OR adjusts policies to work with service role/anon key
-- =====================================================

-- OPTION 1: Disable RLS (simplest for development)
-- Uncomment these if you want to disable RLS entirely:

-- ALTER TABLE onboarding_cases DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_personal DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_banking DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_contract DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_events DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- OPTION 2: Allow anon role to bypass RLS (better)
-- =====================================================
-- This allows the anon key to do CRUD without auth.uid() check

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can view own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Employees can create own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Employees can update own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Admins can view all onboarding cases" ON onboarding_cases;
DROP POLICY IF EXISTS "Admins can update all onboarding cases" ON onboarding_cases;

-- Allow anon role full access (for mock auth during development)
CREATE POLICY "Allow anon full access to onboarding_cases"
  ON onboarding_cases FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Same for onboarding_personal
DROP POLICY IF EXISTS "Employees can manage own personal info" ON onboarding_personal;
DROP POLICY IF EXISTS "Admins can view all personal info" ON onboarding_personal;

CREATE POLICY "Allow anon full access to onboarding_personal"
  ON onboarding_personal FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Same for onboarding_banking
DROP POLICY IF EXISTS "Employees can manage own banking info" ON onboarding_banking;
DROP POLICY IF EXISTS "Admins can view all banking info" ON onboarding_banking;

CREATE POLICY "Allow anon full access to onboarding_banking"
  ON onboarding_banking FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Same for onboarding_contract
DROP POLICY IF EXISTS "Employees can view own contract" ON onboarding_contract;
DROP POLICY IF EXISTS "Admins can manage all contracts" ON onboarding_contract;

CREATE POLICY "Allow anon full access to onboarding_contract"
  ON onboarding_contract FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Same for onboarding_events
DROP POLICY IF EXISTS "Employees can insert own events" ON onboarding_events;
DROP POLICY IF EXISTS "Employees can view own events" ON onboarding_events;
DROP POLICY IF EXISTS "Admins can view all events" ON onboarding_events;

CREATE POLICY "Allow anon full access to onboarding_events"
  ON onboarding_events FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Also fix employees table (same issue)
-- =====================================================

DROP POLICY IF EXISTS "Allow anon full access to employees" ON employees;

CREATE POLICY "Allow anon full access to employees"
  ON employees FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Fix time_entries/submissions table (if exists)
-- =====================================================

-- Check if you have time_entries or submissions table
-- Adjust the table name accordingly

DROP POLICY IF EXISTS "Allow anon full access to time_entries" ON time_entries;

CREATE POLICY "Allow anon full access to time_entries"
  ON time_entries FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- If you have submissions instead:
-- DROP POLICY IF EXISTS "Allow anon full access to submissions" ON submissions;
-- 
-- CREATE POLICY "Allow anon full access to submissions"
--   ON submissions FOR ALL
--   TO anon
--   USING (true)
--   WITH CHECK (true);

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
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('onboarding_cases', 'onboarding_personal', 'onboarding_banking', 
                    'onboarding_contract', 'onboarding_events', 'employees', 'time_entries')
ORDER BY tablename, policyname;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 
-- 🚨 SECURITY WARNING 🚨
-- This configuration is ONLY suitable for development/testing!
-- 
-- For production, you MUST:
-- 1. Implement proper Supabase Auth (signInWithPassword)
-- 2. Store session in Supabase client
-- 3. Use proper auth.uid() based RLS policies
-- 
-- Mock auth bypasses all security and should NEVER be used in production!
-- 
-- =====================================================

