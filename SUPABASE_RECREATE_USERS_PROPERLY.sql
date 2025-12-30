-- =====================================================
-- RECREATE TEST USERS USING PROPER AUTH COLUMNS
-- =====================================================
-- ⚠️ WARNING: This deletes existing auth.users and recreates them
-- with ALL required columns properly set.
-- 
-- Root Cause: Manual INSERT into auth.users left NULL-sensitive
-- columns as NULL, breaking Supabase Auth.
-- =====================================================

DO $$
DECLARE
  v_admin_user_id UUID;
  v_manager_user_id UUID;
  v_employee_user_id UUID;
BEGIN
  RAISE NOTICE 'Starting user recreation...';
  
  -- =====================================================
  -- Step 1: Delete existing test users
  -- =====================================================
  DELETE FROM auth.users WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com');
  RAISE NOTICE '✅ Deleted existing test users from auth.users';
  
  -- =====================================================
  -- Step 2: Create Admin User (with ALL required fields)
  -- =====================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    
    -- ✅ NULL-SENSITIVE COLUMNS (must be empty string, not NULL)
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    
    -- ✅ Additional required columns
    phone,
    phone_confirmed_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
    
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@test.com',
    crypt('admin123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User"}',
    false,
    'authenticated',
    'authenticated',
    
    -- Empty strings (NOT NULL!)
    '',
    '',
    '',
    '',
    
    -- Other fields
    NULL,  -- phone
    NULL,  -- phone_confirmed_at
    '',    -- email_change_token_current
    0,     -- email_change_confirm_status
    NULL,  -- banned_until
    '',    -- reauthentication_token
    NULL,  -- reauthentication_sent_at
    false, -- is_sso_user
    NULL   -- deleted_at
    
  ) RETURNING id INTO v_admin_user_id;
  
  RAISE NOTICE '✅ Created admin user: %', v_admin_user_id;
  
  -- =====================================================
  -- Step 3: Create Manager User
  -- =====================================================
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    phone, phone_confirmed_at, email_change_token_current, email_change_confirm_status,
    banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'manager@test.com',
    crypt('manager123456', gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Manager User"}',
    false, 'authenticated', 'authenticated',
    '', '', '', '',
    NULL, NULL, '', 0, NULL, '', NULL, false, NULL
  ) RETURNING id INTO v_manager_user_id;
  
  RAISE NOTICE '✅ Created manager user: %', v_manager_user_id;
  
  -- =====================================================
  -- Step 4: Create Employee User
  -- =====================================================
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    phone, phone_confirmed_at, email_change_token_current, email_change_confirm_status,
    banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'employee@test.com',
    crypt('employee123456', gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Employee User"}',
    false, 'authenticated', 'authenticated',
    '', '', '', '',
    NULL, NULL, '', 0, NULL, '', NULL, false, NULL
  ) RETURNING id INTO v_employee_user_id;
  
  RAISE NOTICE '✅ Created employee user: %', v_employee_user_id;
  
  -- =====================================================
  -- Step 5: Update employees table with new user_ids
  -- =====================================================
  UPDATE employees SET user_id = v_admin_user_id WHERE email = 'admin@test.com';
  UPDATE employees SET user_id = v_manager_user_id WHERE email = 'manager@test.com';
  UPDATE employees SET user_id = v_employee_user_id WHERE email = 'employee@test.com';
  
  RAISE NOTICE '✅ Updated employees table with new user_ids';
  
  -- =====================================================
  -- Step 6: Verify all users have proper columns
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ ALL TEST USERS RECREATED PROPERLY                 ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Credentials:';
  RAISE NOTICE '  👤 admin@test.com / admin123456';
  RAISE NOTICE '  👤 manager@test.com / manager123456';
  RAISE NOTICE '  👤 employee@test.com / employee123456';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Test login in browser';
  RAISE NOTICE '';
  
END $$;

-- =====================================================
-- VERIFY: Check NULL-sensitive columns
-- =====================================================
SELECT 
  email,
  confirmation_token = '' as confirmation_token_ok,
  email_change = '' as email_change_ok,
  email_change_token_new = '' as email_change_token_new_ok,
  recovery_token = '' as recovery_token_ok,
  email_confirmed_at IS NOT NULL as email_confirmed,
  confirmed_at IS NOT NULL as account_confirmed,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
ORDER BY email;

-- All should show 'true'

