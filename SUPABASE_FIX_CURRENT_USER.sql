-- =====================================================
-- FIX CURRENT USER - Create Employee Record
-- =====================================================
-- This creates an employee record for whoever is currently
-- logged into the app (fixes PGRST116 errors)
-- =====================================================

DO $$
DECLARE
  v_existing_count INTEGER;
  v_created_count INTEGER := 0;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔧 FIXING CURRENT USER...';
  RAISE NOTICE '==========================================';

  -- Count existing employees
  SELECT COUNT(*) INTO v_existing_count FROM employees;
  RAISE NOTICE 'Current employees in database: %', v_existing_count;

  -- Create employee records for ALL auth users that don't have one
  INSERT INTO employees (
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at,
    updated_at
  )
  SELECT 
    gen_random_uuid(),
    au.id,
    COALESCE((au.raw_user_meta_data->>'name')::text, 'User ' || SUBSTRING(au.email FROM 1 FOR 10)),
    au.email,
    CASE 
      WHEN au.email ILIKE '%admin%' THEN 'admin'
      WHEN au.email ILIKE '%manager%' THEN 'manager'
      ELSE 'employee'
    END,
    'active',
    now(),
    now()
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.user_id = au.id
  );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RAISE NOTICE '✅ Created % new employee records', v_created_count;

  -- Show all employees with their auth status
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 ALL EMPLOYEES:';
  RAISE NOTICE '==========================================';
  
  FOR rec IN 
    SELECT 
      e.id,
      e.user_id,
      e.name,
      e.email,
      e.role,
      e.status
    FROM employees e
    ORDER BY e.created_at DESC
  LOOP
    RAISE NOTICE '- % (%) - % - %', rec.name, rec.email, rec.role, rec.status;
  END LOOP;

  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Next step: Refresh your browser (Cmd+R or F5)';
  RAISE NOTICE '==========================================';
END $$;

-- Verify: Show all auth users and their employee records
SELECT 
  au.id as auth_user_id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  e.id as employee_id,
  e.role,
  e.status,
  CASE 
    WHEN e.id IS NOT NULL THEN '✅ Has employee record'
    ELSE '❌ Missing employee record'
  END as status_check
FROM auth.users au
LEFT JOIN employees e ON e.user_id = au.id
ORDER BY au.created_at DESC;

