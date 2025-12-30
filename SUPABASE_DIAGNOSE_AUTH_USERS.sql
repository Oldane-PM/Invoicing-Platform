-- =====================================================
-- DIAGNOSE AUTH.USERS FOR NULL-SENSITIVE COLUMNS
-- =====================================================
-- Supabase Auth expects certain columns to be non-null strings.
-- If users were inserted manually, NULL values will break Auth.
-- =====================================================

-- Step 1: Check all 3 test users for problematic NULL values
SELECT 
  id,
  email,
  
  -- These columns MUST NOT be NULL for Auth to work
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  
  -- Also check these common problem fields
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  
  -- Metadata
  raw_app_meta_data,
  raw_user_meta_data,
  
  created_at,
  updated_at
  
FROM auth.users
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY email;

-- =====================================================
-- EXPECTED ISSUES:
-- =====================================================
-- ❌ confirmation_token = NULL (should be '')
-- ❌ email_change = NULL (should be '')
-- ❌ email_change_token_new = NULL (should be '')
-- ❌ recovery_token = NULL (should be '')
-- ❌ encrypted_password = NULL (users can't log in!)
-- ❌ email_confirmed_at = NULL (email not confirmed)

-- =====================================================
-- Step 2: Check if users exist at all
-- =====================================================
SELECT 
  COUNT(*) as total_test_users,
  COUNT(*) FILTER (WHERE encrypted_password IS NOT NULL) as users_with_password,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as users_confirmed
FROM auth.users
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com');

-- Should show:
-- total_test_users = 3
-- users_with_password = 3 (if 0, passwords weren't set!)
-- users_confirmed = 3 (if 0, emails not confirmed!)

-- =====================================================
-- Step 3: Show all columns to identify other NULLs
-- =====================================================
\echo ''
\echo '=== FULL USER RECORD (employee@test.com) ==='
SELECT * FROM auth.users WHERE email = 'employee@test.com';

