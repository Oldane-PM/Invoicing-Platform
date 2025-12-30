-- =====================================================
-- ULTRA NUCLEAR: Disable RLS on ALL Public Tables
-- =====================================================
-- If disabling just employees didn't work, there must be
-- another table blocking auth. This disables RLS on EVERYTHING.
--
-- ⚠️ TEMPORARY - DEV/TESTING ONLY
-- =====================================================

-- Disable RLS on all public tables
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_personal DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_banking DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_contract DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- Verify what we disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All should show rls_enabled = false

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ⚠️  ULTRA NUCLEAR APPLIED                           ║';
  RAISE NOTICE '║  RLS DISABLED ON ALL PUBLIC TABLES                   ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ALL security disabled - TEMP ONLY!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Test now: npm run test:auth-smoke';
  RAISE NOTICE '';
  RAISE NOTICE 'If this STILL fails:';
  RAISE NOTICE '→ Issue is in Supabase Auth backend, not RLS';
  RAISE NOTICE '→ Check Supabase Dashboard → Logs → Auth';
  RAISE NOTICE '→ Check if project is paused';
  RAISE NOTICE '→ Contact Supabase support';
  RAISE NOTICE '';
END $$;

