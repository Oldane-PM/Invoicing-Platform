-- =====================================================
-- CLEAN DATABASE AND SEED TEST USERS
-- =====================================================
-- ⚠️ WARNING: This will DELETE ALL DATA!
-- Use this for development/testing only
-- 
-- Creates 3 test users:
-- 1. Admin (admin@test.com / admin123456)
-- 2. Manager (manager@test.com / manager123456)
-- 3. Employee (employee@test.com / employee123456)
-- =====================================================

-- =====================================================
-- STEP 1: Clean all tables (CASCADE to handle FK constraints)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🧹 CLEANING ALL DATA...';
  RAISE NOTICE '==========================================';
END $$;

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Truncate all tables in the correct order (FK dependencies)
DO $$
BEGIN
  -- Truncate tables only if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_events') THEN
    TRUNCATE TABLE onboarding_events CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_contract') THEN
    TRUNCATE TABLE onboarding_contract CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_banking') THEN
    TRUNCATE TABLE onboarding_banking CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_personal') THEN
    TRUNCATE TABLE onboarding_personal CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_cases') THEN
    TRUNCATE TABLE onboarding_cases CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    TRUNCATE TABLE invoices CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    TRUNCATE TABLE notifications CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    TRUNCATE TABLE team_members CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN
    TRUNCATE TABLE submissions CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    TRUNCATE TABLE employees CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    TRUNCATE TABLE projects CASCADE;
  END IF;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

DO $$
BEGIN
  RAISE NOTICE '✅ All tables cleaned';
END $$;

-- =====================================================
-- STEP 2: Delete all auth users (except service role)
-- =====================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE '🗑️  Deleting auth users...';
  
  FOR user_record IN 
    SELECT id FROM auth.users
  LOOP
    -- Delete user (this will cascade to related tables)
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Auth users deleted';
END $$;

-- =====================================================
-- STEP 3: Create test auth users
-- =====================================================

DO $$
DECLARE
  v_admin_user_id UUID;
  v_manager_user_id UUID;
  v_employee_user_id UUID;
  v_admin_employee_id UUID;
  v_manager_employee_id UUID;
  v_employee_employee_id UUID;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '👥 CREATING TEST USERS...';
  RAISE NOTICE '==========================================';

  -- Create Admin User
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@test.com',
    crypt('admin123456', gen_salt('bf')), -- Password: admin123456
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User"}',
    false,
    'authenticated',
    'authenticated'
  ) RETURNING id INTO v_admin_user_id;

  -- Create Manager User
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'manager@test.com',
    crypt('manager123456', gen_salt('bf')), -- Password: manager123456
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Manager User"}',
    false,
    'authenticated',
    'authenticated'
  ) RETURNING id INTO v_manager_user_id;

  -- Create Employee User
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'employee@test.com',
    crypt('employee123456', gen_salt('bf')), -- Password: employee123456
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Employee User"}',
    false,
    'authenticated',
    'authenticated'
  ) RETURNING id INTO v_employee_user_id;

  RAISE NOTICE '✅ Created 3 auth users';

  -- =====================================================
  -- STEP 4: Create employee records
  -- =====================================================
  
  RAISE NOTICE '📝 Creating employee records...';

  -- Create Admin Employee
  INSERT INTO employees (
    id,
    user_id,
    name,
    email,
    role,
    status,
    reporting_manager_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_admin_user_id,
    'Admin User',
    'admin@test.com',
    'admin',
    'active',
    NULL, -- Admin has no manager
    now(),
    now()
  ) RETURNING id INTO v_admin_employee_id;

  -- Create Manager Employee
  INSERT INTO employees (
    id,
    user_id,
    name,
    email,
    role,
    status,
    reporting_manager_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_manager_user_id,
    'Manager User',
    'manager@test.com',
    'manager',
    'active',
    v_admin_employee_id, -- Manager reports to Admin
    now(),
    now()
  ) RETURNING id INTO v_manager_employee_id;

  -- Create Employee (active, for testing)
  INSERT INTO employees (
    id,
    user_id,
    name,
    email,
    role,
    status,
    reporting_manager_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_employee_user_id,
    'Employee User',
    'employee@test.com',
    'employee',
    'active',
    v_manager_employee_id, -- Employee reports to Manager
    now(),
    now()
  ) RETURNING id INTO v_employee_employee_id;

  RAISE NOTICE '✅ Created 3 employee records';

  -- =====================================================
  -- STEP 5: Create a sample project
  -- =====================================================
  
  RAISE NOTICE '📁 Creating sample project...';

  INSERT INTO projects (
    id,
    name,
    description,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'Sample Project',
    'A test project for demonstration purposes',
    now()
  );

  RAISE NOTICE '✅ Created sample project';

  -- =====================================================
  -- STEP 6: Create a pending employee onboarding case
  -- =====================================================
  
  RAISE NOTICE '📋 Creating sample onboarding case...';

  -- Create a new auth user for onboarding test
  DECLARE
    v_onboarding_user_id UUID;
    v_onboarding_case_id UUID;
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'newemployee@test.com',
      crypt('newemployee123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"New Employee"}',
      false,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_onboarding_user_id;

    -- Create onboarding case
    INSERT INTO onboarding_cases (
      id,
      user_id,
      current_state,
      submitted_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_onboarding_user_id,
      'submitted', -- Ready for admin review
      now(),
      now(),
      now()
    ) RETURNING id INTO v_onboarding_case_id;

    -- Add personal info
    INSERT INTO onboarding_personal (
      case_id,
      full_name,
      address,
      city,
      state_parish,
      country,
      zip_code,
      phone,
      email,
      completed_at,
      created_at,
      updated_at
    ) VALUES (
      v_onboarding_case_id,
      'New Employee',
      '123 Test Street',
      'Kingston',
      'Kingston',
      'Jamaica',
      '12345',
      '876-555-1234',
      'newemployee@test.com',
      now(),
      now(),
      now()
    );

    -- Add banking info
    INSERT INTO onboarding_banking (
      case_id,
      bank_name,
      bank_address,
      branch,
      account_number_encrypted,
      account_type,
      currency,
      completed_at,
      created_at,
      updated_at
    ) VALUES (
      v_onboarding_case_id,
      'National Commercial Bank',
      'Kingston Branch',
      'Half Way Tree',
      '1234567890', -- In production, this should be encrypted
      'checking',
      'JMD',
      now(),
      now(),
      now()
    );

    -- Add events
    INSERT INTO onboarding_events (
      case_id,
      event_type,
      actor_user_id,
      payload,
      created_at
    ) VALUES 
      (v_onboarding_case_id, 'case_created', v_onboarding_user_id, '{}'::jsonb, now() - interval '2 days'),
      (v_onboarding_case_id, 'personal_updated', v_onboarding_user_id, '{"fields": ["full_name", "address"]}'::jsonb, now() - interval '1 day'),
      (v_onboarding_case_id, 'banking_updated', v_onboarding_user_id, '{"bank_name": "NCB"}'::jsonb, now() - interval '1 day'),
      (v_onboarding_case_id, 'submitted', v_onboarding_user_id, '{}'::jsonb, now());

    RAISE NOTICE '✅ Created sample onboarding case';
  END;

  -- =====================================================
  -- SUMMARY
  -- =====================================================

  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ DATABASE SEEDED SUCCESSFULLY!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '👥 Test Users Created:';
  RAISE NOTICE '  1. Admin:';
  RAISE NOTICE '     Email: admin@test.com';
  RAISE NOTICE '     Password: admin123456';
  RAISE NOTICE '     Role: admin';
  RAISE NOTICE '';
  RAISE NOTICE '  2. Manager:';
  RAISE NOTICE '     Email: manager@test.com';
  RAISE NOTICE '     Password: manager123456';
  RAISE NOTICE '     Role: manager';
  RAISE NOTICE '';
  RAISE NOTICE '  3. Employee:';
  RAISE NOTICE '     Email: employee@test.com';
  RAISE NOTICE '     Password: employee123456';
  RAISE NOTICE '     Role: employee (active)';
  RAISE NOTICE '';
  RAISE NOTICE '  4. New Employee (Onboarding):';
  RAISE NOTICE '     Email: newemployee@test.com';
  RAISE NOTICE '     Password: newemployee123456';
  RAISE NOTICE '     Status: Pending admin review';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Reporting Structure:';
  RAISE NOTICE '  Admin (no manager)';
  RAISE NOTICE '   └─ Manager';
  RAISE NOTICE '       └─ Employee';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Sample Data:';
  RAISE NOTICE '  - 1 Project created';
  RAISE NOTICE '  - 1 Onboarding case (submitted, awaiting review)';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. Login as admin@test.com';
  RAISE NOTICE '  2. Review pending onboarding at /admin/onboarding';
  RAISE NOTICE '  3. Test approval workflow';
  RAISE NOTICE '==========================================';

END $$;

