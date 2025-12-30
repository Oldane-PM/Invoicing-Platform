-- =====================================================
-- CHECK AUTH SCHEMA HEALTH
-- =====================================================
-- This checks if the auth schema itself is accessible
-- and healthy, which is required for Supabase Auth to work
-- =====================================================

-- =====================================================
-- Check 1: Does auth schema exist?
-- =====================================================

SELECT 
  schema_name,
  CASE 
    WHEN schema_name = 'auth' THEN '✅ Auth schema exists'
    ELSE '❌ Auth schema missing'
  END as status
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- =====================================================
-- Check 2: Can we access auth.users?
-- =====================================================

SELECT 
  'auth.users' as table_name,
  COUNT(*) as user_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Can access auth.users and has users'
    ELSE '⚠️  Can access auth.users but empty'
  END as status
FROM auth.users;

-- =====================================================
-- Check 3: List all test users
-- =====================================================

SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE email IN ('admin@test.com', 'employee@test.com', 'manager@test.com', 'new@test.com')
ORDER BY email;

-- =====================================================
-- Check 4: Auth schema tables
-- =====================================================

SELECT 
  table_name,
  '✅ Exists' as status
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- Should show: audit_log_entries, identities, instances, refresh_tokens,
--              saml_providers, saml_relay_states, schema_migrations,
--              sessions, sso_domains, sso_providers, users

-- =====================================================
-- Check 5: Permissions on auth schema
-- =====================================================

SELECT 
  grantee,
  privilege_type,
  CASE 
    WHEN grantee = 'anon' AND privilege_type = 'USAGE' THEN '✅ Anon has USAGE'
    WHEN grantee = 'authenticated' AND privilege_type = 'USAGE' THEN '✅ Authenticated has USAGE'
    ELSE privilege_type
  END as status
FROM information_schema.schema_privileges
WHERE schema_name = 'auth'
ORDER BY grantee, privilege_type;

-- =====================================================
-- Check 6: RLS on auth.users (should be enabled!)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS enabled (correct for auth tables)'
    ELSE '❌ RLS disabled (auth tables should have RLS!)'
  END as status
FROM pg_tables
WHERE schemaname = 'auth' AND tablename = 'users';

-- =====================================================
-- DIAGNOSIS SUMMARY
-- =====================================================

DO $$
DECLARE
  v_auth_schema_exists BOOLEAN;
  v_users_count INTEGER;
BEGIN
  -- Check if auth schema exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
  ) INTO v_auth_schema_exists;
  
  -- Check user count
  SELECT COUNT(*) INTO v_users_count FROM auth.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  AUTH SCHEMA HEALTH CHECK                             ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  IF v_auth_schema_exists THEN
    RAISE NOTICE '✅ Auth schema exists';
  ELSE
    RAISE NOTICE '❌ Auth schema MISSING - CRITICAL!';
    RAISE NOTICE '   → Contact Supabase support immediately';
    RETURN;
  END IF;
  
  IF v_users_count > 0 THEN
    RAISE NOTICE '✅ Auth.users accessible (% users)', v_users_count;
  ELSE
    RAISE NOTICE '⚠️  Auth.users accessible but empty';
    RAISE NOTICE '   → Run SUPABASE_CLEAN_AND_SEED.sql to create test users';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Review the query results above for details';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR accessing auth schema: %', SQLERRM;
    RAISE NOTICE '   This means Supabase Auth backend is broken!';
    RAISE NOTICE '   → Check Supabase Dashboard → Logs';
    RAISE NOTICE '   → Contact Supabase support';
    RAISE NOTICE '';
END $$;

