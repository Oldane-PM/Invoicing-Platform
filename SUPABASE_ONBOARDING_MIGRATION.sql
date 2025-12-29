-- =====================================================
-- ONBOARDING SYSTEM REFACTOR - SUPABASE MIGRATION
-- =====================================================
-- Copy this entire file and run it in Supabase Dashboard → SQL Editor
-- 
-- This migration creates:
-- ✅ Dedicated onboarding tables (cases, personal, banking, contract, events)
-- ✅ State machine for workflow management
-- ✅ RLS policies for security
-- ✅ Admin approval functions
-- ✅ Timesheet submission gate
-- 
-- Time to run: ~5 seconds
-- =====================================================

-- =====================================================
-- STEP 1: Create Enums
-- =====================================================

DO $$ 
BEGIN
  -- Onboarding case state enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_state') THEN
    CREATE TYPE onboarding_state AS ENUM (
      'draft',               -- Initial state, employee filling out forms
      'submitted',           -- Employee submitted personal + banking info
      'personal_pending',    -- Admin requested changes to personal info
      'banking_pending',     -- Admin requested changes to banking info
      'admin_review',        -- Under admin review
      'contract_pending',    -- Admin adding contract details
      'manager_pending',     -- Waiting for manager assignment
      'approved',            -- Fully approved, employee active
      'rejected',            -- Rejected by admin
      'closed'               -- Case closed (archived)
    );
    RAISE NOTICE 'Created onboarding_state enum';
  END IF;

  -- Event type enum for audit trail
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_event_type') THEN
    CREATE TYPE onboarding_event_type AS ENUM (
      'case_created',
      'submitted',
      'personal_updated',
      'banking_updated',
      'contract_updated',
      'manager_assigned',
      'admin_approved',
      'admin_rejected',
      'case_closed',
      'resubmitted'
    );
    RAISE NOTICE 'Created onboarding_event_type enum';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create onboarding_cases table
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- State machine
  current_state onboarding_state NOT NULL DEFAULT 'draft',
  
  -- Timestamps for workflow tracking
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Admin review
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES employees(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_user_id ON onboarding_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_state ON onboarding_cases(current_state);
CREATE INDEX IF NOT EXISTS idx_onboarding_cases_submitted ON onboarding_cases(submitted_at) WHERE submitted_at IS NOT NULL;

COMMENT ON TABLE onboarding_cases IS 'One onboarding journey per user';

-- =====================================================
-- STEP 3: Create onboarding_personal table
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_personal (
  case_id UUID PRIMARY KEY REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  
  -- Personal information
  full_name TEXT,
  address TEXT,
  city TEXT,
  state_parish TEXT,
  country TEXT DEFAULT 'Jamaica',
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  
  -- Employment preferences
  preferred_start_date DATE,
  
  -- Metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE onboarding_personal IS 'Employee personal information (1-to-1 with case)';

-- =====================================================
-- STEP 4: Create onboarding_banking table
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_banking (
  case_id UUID PRIMARY KEY REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  
  -- Bank information
  bank_name TEXT,
  bank_address TEXT,
  branch TEXT,
  
  -- Account details (ENCRYPTED in production!)
  account_number_encrypted TEXT,
  account_type TEXT,
  
  -- International routing
  swift_code TEXT,
  aba_wire_routing TEXT,
  currency TEXT DEFAULT 'JMD',
  
  -- Encryption metadata
  encryption_key_version TEXT DEFAULT 'v1',
  
  -- Metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE onboarding_banking IS 'Employee banking details (encrypted in production)';

-- =====================================================
-- STEP 5: Create onboarding_contract table
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_contract (
  case_id UUID PRIMARY KEY REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  
  -- Contract terms
  employment_type TEXT,
  position_title TEXT,
  department TEXT,
  
  -- Compensation
  rate NUMERIC(10, 2),
  rate_type TEXT,
  currency TEXT DEFAULT 'JMD',
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Manager assignment
  manager_id UUID REFERENCES employees(id),
  
  -- Document storage
  contract_file_path TEXT,
  contract_file_url TEXT,
  
  -- Admin tracking
  completed_by UUID REFERENCES employees(id),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE onboarding_contract IS 'Employment contract details (admin-managed)';

-- =====================================================
-- STEP 6: Create onboarding_events table (audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  
  -- Event details
  event_type onboarding_event_type NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_employee_id UUID REFERENCES employees(id),
  
  -- Event payload (flexible JSON for context)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_events_case_id ON onboarding_events(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_type ON onboarding_events(event_type);

COMMENT ON TABLE onboarding_events IS 'Audit trail for all onboarding actions';

-- =====================================================
-- STEP 7: Add updated_at triggers
-- =====================================================

-- Reuse existing trigger function (should already exist from migration 001)
-- If not, create it:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_onboarding_cases_updated_at ON onboarding_cases;
CREATE TRIGGER update_onboarding_cases_updated_at 
  BEFORE UPDATE ON onboarding_cases
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_personal_updated_at ON onboarding_personal;
CREATE TRIGGER update_onboarding_personal_updated_at 
  BEFORE UPDATE ON onboarding_personal
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_banking_updated_at ON onboarding_banking;
CREATE TRIGGER update_onboarding_banking_updated_at 
  BEFORE UPDATE ON onboarding_banking
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_contract_updated_at ON onboarding_contract;
CREATE TRIGGER update_onboarding_contract_updated_at 
  BEFORE UPDATE ON onboarding_contract
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 8: Enable RLS on all onboarding tables
-- =====================================================

ALTER TABLE onboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Create is_admin() helper function
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM employees 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin';

-- =====================================================
-- STEP 10: RLS Policies for onboarding_cases
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Employees can create own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Employees can update own onboarding case" ON onboarding_cases;
DROP POLICY IF EXISTS "Admins can view all onboarding cases" ON onboarding_cases;
DROP POLICY IF EXISTS "Admins can update all onboarding cases" ON onboarding_cases;

-- Employees can view their own case
CREATE POLICY "Employees can view own onboarding case"
  ON onboarding_cases FOR SELECT
  USING (user_id = auth.uid());

-- Employees can create their own case
CREATE POLICY "Employees can create own onboarding case"
  ON onboarding_cases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Employees can update their own case (limited states)
CREATE POLICY "Employees can update own onboarding case"
  ON onboarding_cases FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    current_state IN ('draft', 'submitted', 'personal_pending', 'banking_pending')
  );

-- Admins can view all cases
CREATE POLICY "Admins can view all onboarding cases"
  ON onboarding_cases FOR SELECT
  USING (is_admin());

-- Admins can update all cases
CREATE POLICY "Admins can update all onboarding cases"
  ON onboarding_cases FOR UPDATE
  USING (is_admin());

-- =====================================================
-- STEP 11: RLS Policies for onboarding_personal
-- =====================================================

DROP POLICY IF EXISTS "Employees can manage own personal info" ON onboarding_personal;
DROP POLICY IF EXISTS "Admins can view all personal info" ON onboarding_personal;

-- Employees can manage their own personal info
CREATE POLICY "Employees can manage own personal info"
  ON onboarding_personal FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_personal.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can view all personal info
CREATE POLICY "Admins can view all personal info"
  ON onboarding_personal FOR SELECT
  USING (is_admin());

-- =====================================================
-- STEP 12: RLS Policies for onboarding_banking
-- =====================================================

DROP POLICY IF EXISTS "Employees can manage own banking info" ON onboarding_banking;
DROP POLICY IF EXISTS "Admins can view all banking info" ON onboarding_banking;

-- Employees can manage their own banking info
CREATE POLICY "Employees can manage own banking info"
  ON onboarding_banking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_banking.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can view all banking info
CREATE POLICY "Admins can view all banking info"
  ON onboarding_banking FOR SELECT
  USING (is_admin());

-- =====================================================
-- STEP 13: RLS Policies for onboarding_contract
-- =====================================================

DROP POLICY IF EXISTS "Employees can view own contract" ON onboarding_contract;
DROP POLICY IF EXISTS "Admins can manage all contracts" ON onboarding_contract;

-- Employees can view their own contract (read-only)
CREATE POLICY "Employees can view own contract"
  ON onboarding_contract FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_contract.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Admins can manage all contracts
CREATE POLICY "Admins can manage all contracts"
  ON onboarding_contract FOR ALL
  USING (is_admin());

-- =====================================================
-- STEP 14: RLS Policies for onboarding_events
-- =====================================================

DROP POLICY IF EXISTS "Employees can view own onboarding events" ON onboarding_events;
DROP POLICY IF EXISTS "Employees can create own onboarding events" ON onboarding_events;
DROP POLICY IF EXISTS "Admins can manage all onboarding events" ON onboarding_events;

-- Employees can view events for their own case
CREATE POLICY "Employees can view own onboarding events"
  ON onboarding_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = onboarding_events.case_id
        AND oc.user_id = auth.uid()
    )
  );

-- Employees can insert events for their own case
CREATE POLICY "Employees can create own onboarding events"
  ON onboarding_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM onboarding_cases oc
      WHERE oc.id = case_id
        AND oc.user_id = auth.uid()
    ) AND
    event_type IN ('personal_updated', 'banking_updated', 'submitted', 'resubmitted')
  );

-- Admins can manage all events
CREATE POLICY "Admins can manage all onboarding events"
  ON onboarding_events FOR ALL
  USING (is_admin());

-- =====================================================
-- STEP 15: Create approve_onboarding function
-- =====================================================

CREATE OR REPLACE FUNCTION approve_onboarding(
  p_case_id UUID,
  p_manager_employee_id UUID,
  p_contract JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_employee_id UUID;
  v_case_state onboarding_state;
BEGIN
  -- Validate caller is admin
  IF NOT is_admin() THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required';
    RETURN;
  END IF;

  -- Get case details
  SELECT user_id, current_state, employee_id
  INTO v_user_id, v_case_state, v_employee_id
  FROM onboarding_cases
  WHERE id = p_case_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Case not found';
    RETURN;
  END IF;

  -- Validate state is approvable
  IF v_case_state NOT IN ('submitted', 'admin_review', 'contract_pending', 'manager_pending') THEN
    RETURN QUERY SELECT FALSE, 'Case is not in an approvable state';
    RETURN;
  END IF;

  -- Start transaction
  BEGIN
    -- 1. Upsert contract details
    INSERT INTO onboarding_contract (
      case_id,
      employment_type,
      position_title,
      department,
      rate,
      rate_type,
      currency,
      start_date,
      end_date,
      manager_id,
      completed_by,
      completed_at
    )
    VALUES (
      p_case_id,
      p_contract->>'employment_type',
      p_contract->>'position_title',
      p_contract->>'department',
      (p_contract->>'rate')::NUMERIC,
      p_contract->>'rate_type',
      COALESCE(p_contract->>'currency', 'JMD'),
      (p_contract->>'start_date')::DATE,
      (p_contract->>'end_date')::DATE,
      p_manager_employee_id,
      (SELECT id FROM employees WHERE user_id = auth.uid()),
      now()
    )
    ON CONFLICT (case_id) DO UPDATE SET
      employment_type = EXCLUDED.employment_type,
      position_title = EXCLUDED.position_title,
      department = EXCLUDED.department,
      rate = EXCLUDED.rate,
      rate_type = EXCLUDED.rate_type,
      currency = EXCLUDED.currency,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      manager_id = EXCLUDED.manager_id,
      completed_by = EXCLUDED.completed_by,
      completed_at = EXCLUDED.completed_at,
      updated_at = now();

    -- 2. Create or update employee record (make them active)
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
    )
    SELECT
      COALESCE(v_employee_id, gen_random_uuid()),
      v_user_id,
      op.full_name,
      op.email,
      'EMPLOYEE',
      'active',
      p_manager_employee_id,
      now(),
      now()
    FROM onboarding_personal op
    WHERE op.case_id = p_case_id
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      reporting_manager_id = EXCLUDED.reporting_manager_id,
      updated_at = now()
    RETURNING id INTO v_employee_id;

    -- 3. Update onboarding case to approved
    UPDATE onboarding_cases SET
      current_state = 'approved',
      approved_at = now(),
      reviewed_by = (SELECT id FROM employees WHERE user_id = auth.uid()),
      employee_id = v_employee_id,
      updated_at = now()
    WHERE id = p_case_id;

    -- 4. Insert approval event
    INSERT INTO onboarding_events (
      case_id,
      event_type,
      actor_user_id,
      actor_employee_id,
      payload
    )
    VALUES (
      p_case_id,
      'admin_approved',
      auth.uid(),
      (SELECT id FROM employees WHERE user_id = auth.uid()),
      jsonb_build_object(
        'manager_id', p_manager_employee_id,
        'approved_at', now()
      )
    );

    RETURN QUERY SELECT TRUE, 'Onboarding approved successfully';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_onboarding IS 'Approve employee onboarding and create active employee record';

-- =====================================================
-- STEP 16: Create reject_onboarding function
-- =====================================================

CREATE OR REPLACE FUNCTION reject_onboarding(
  p_case_id UUID,
  p_rejection_reason TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_case_state onboarding_state;
BEGIN
  -- Validate caller is admin
  IF NOT is_admin() THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required';
    RETURN;
  END IF;

  -- Get case state
  SELECT current_state INTO v_case_state
  FROM onboarding_cases
  WHERE id = p_case_id;

  IF v_case_state IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Case not found';
    RETURN;
  END IF;

  -- Update case to rejected
  UPDATE onboarding_cases SET
    current_state = 'rejected',
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    reviewed_by = (SELECT id FROM employees WHERE user_id = auth.uid()),
    updated_at = now()
  WHERE id = p_case_id;

  -- Insert rejection event
  INSERT INTO onboarding_events (
    case_id,
    event_type,
    actor_user_id,
    actor_employee_id,
    payload
  )
  VALUES (
    p_case_id,
    'admin_rejected',
    auth.uid(),
    (SELECT id FROM employees WHERE user_id = auth.uid()),
    jsonb_build_object('reason', p_rejection_reason, 'rejected_at', now())
  );

  RETURN QUERY SELECT TRUE, 'Onboarding rejected';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_onboarding IS 'Reject employee onboarding with reason';

-- =====================================================
-- STEP 17: Update timesheet submission gate
-- =====================================================

-- Drop old policy
DROP POLICY IF EXISTS "Employees can create own submissions" ON submissions;
DROP POLICY IF EXISTS "Active employees can create submissions" ON submissions;

-- New policy: Only active employees can submit hours
CREATE POLICY "Active employees can create submissions"
  ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.id = employee_id
    )
  );

COMMENT ON POLICY "Active employees can create submissions" ON submissions IS 
  'Ensures only approved employees (status=active) can submit hours';

-- =====================================================
-- STEP 18: Create admin view for onboarding queue
-- =====================================================

CREATE OR REPLACE VIEW admin_onboarding_queue_v2 AS
SELECT 
  oc.id as case_id,
  oc.user_id,
  oc.current_state,
  oc.submitted_at,
  oc.approved_at,
  oc.rejected_at,
  oc.rejection_reason,
  oc.created_at,
  oc.updated_at,
  
  -- Personal info
  op.full_name,
  op.email,
  op.phone,
  op.address,
  op.city,
  op.state_parish,
  op.country,
  op.completed_at as personal_completed_at,
  
  -- Banking info (limited fields for security)
  ob.bank_name,
  ob.account_type,
  ob.currency,
  ob.completed_at as banking_completed_at,
  
  -- Contract info
  oc_contract.position_title,
  oc_contract.employment_type,
  oc_contract.rate,
  oc_contract.rate_type,
  oc_contract.start_date,
  oc_contract.manager_id,
  
  -- Manager name
  m.name as manager_name,
  
  -- Reviewer
  reviewer.name as reviewed_by_name
  
FROM onboarding_cases oc
LEFT JOIN onboarding_personal op ON op.case_id = oc.id
LEFT JOIN onboarding_banking ob ON ob.case_id = oc.id
LEFT JOIN onboarding_contract oc_contract ON oc_contract.case_id = oc.id
LEFT JOIN employees m ON m.id = oc_contract.manager_id
LEFT JOIN employees reviewer ON reviewer.id = oc.reviewed_by
WHERE oc.current_state NOT IN ('approved', 'closed')
ORDER BY 
  CASE oc.current_state
    WHEN 'submitted' THEN 1
    WHEN 'admin_review' THEN 2
    WHEN 'contract_pending' THEN 3
    WHEN 'rejected' THEN 4
    ELSE 5
  END,
  oc.submitted_at DESC NULLS LAST;

GRANT SELECT ON admin_onboarding_queue_v2 TO authenticated;

COMMENT ON VIEW admin_onboarding_queue_v2 IS 'Admin view of pending onboarding cases';

-- =====================================================
-- STEP 19: Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON onboarding_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON onboarding_personal TO authenticated;
GRANT SELECT, INSERT, UPDATE ON onboarding_banking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON onboarding_contract TO authenticated;
GRANT SELECT, INSERT ON onboarding_events TO authenticated;

-- =====================================================
-- ✅ MIGRATION COMPLETE!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Onboarding system migration complete!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 2 enums (onboarding_state, onboarding_event_type)';
  RAISE NOTICE '  - 5 tables (cases, personal, banking, contract, events)';
  RAISE NOTICE '  - 15 RLS policies';
  RAISE NOTICE '  - 3 functions (is_admin, approve_onboarding, reject_onboarding)';
  RAISE NOTICE '  - 1 view (admin_onboarding_queue_v2)';
  RAISE NOTICE '  - Timesheet submission gate';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update app code to use new schema';
  RAISE NOTICE '  2. Test signup → onboarding → approval flow';
  RAISE NOTICE '  3. Verify timesheet gate works';
  RAISE NOTICE '==========================================';
END $$;

