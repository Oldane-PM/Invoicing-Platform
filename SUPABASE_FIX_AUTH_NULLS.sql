-- =====================================================
-- FIX AUTH.USERS NULL-SENSITIVE COLUMNS
-- =====================================================
-- This script patches NULL values that break Supabase Auth.
-- Run ONLY after confirming NULLs exist via SUPABASE_DIAGNOSE_AUTH_USERS.sql
-- =====================================================

-- Step 1: Patch NULL string columns to empty strings
UPDATE auth.users
SET
  confirmation_token     = COALESCE(confirmation_token, ''),
  email_change           = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token         = COALESCE(recovery_token, ''),
  
  -- Ensure email is confirmed (required for login)
  email_confirmed_at     = COALESCE(email_confirmed_at, NOW()),
  
  -- Note: confirmed_at is a GENERATED column, don't update it directly
  
  -- Update timestamp
  updated_at             = NOW()
  
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
  AND (
    confirmation_token IS NULL OR
    email_change IS NULL OR
    email_change_token_new IS NULL OR
    recovery_token IS NULL OR
    email_confirmed_at IS NULL
  );

-- Step 2: Verify the fix
SELECT 
  email,
  
  -- Check all previously NULL columns
  confirmation_token = '' as confirmation_token_fixed,
  email_change = '' as email_change_fixed,
  email_change_token_new = '' as email_change_token_new_fixed,
  recovery_token = '' as recovery_token_fixed,
  
  -- Check confirmation status
  email_confirmed_at IS NOT NULL as email_confirmed,
  confirmed_at IS NOT NULL as account_confirmed,
  
  -- Check password exists
  encrypted_password IS NOT NULL as has_password
  
FROM auth.users
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY email;

-- =====================================================
-- EXPECTED RESULT: All should show 'true'
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ AUTH.USERS NULL VALUES PATCHED                    ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'All test users should now have:';
  RAISE NOTICE '  ✅ confirmation_token = ''''';
  RAISE NOTICE '  ✅ email_change = ''''';
  RAISE NOTICE '  ✅ email_change_token_new = ''''';
  RAISE NOTICE '  ✅ recovery_token = ''''';
  RAISE NOTICE '  ✅ email_confirmed_at = NOW()';
  RAISE NOTICE '  ✅ confirmed_at = NOW()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Test login in browser';
  RAISE NOTICE '';
END $$;

