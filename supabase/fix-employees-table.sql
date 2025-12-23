-- Fix Employees Table - Add all missing columns and insert test employees

-- 1. Add all potentially missing columns (safe to run multiple times)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rate_type VARCHAR(50) DEFAULT 'hourly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_start_date DATE;

-- 2. Add constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_status_check 
    CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_rate_type_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_rate_type_check 
    CHECK (rate_type IN ('hourly', 'fixed'));
  END IF;
END $$;

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- 4. Update existing employees to have active status
UPDATE employees 
SET status = 'active' 
WHERE status IS NULL;

-- 5. Insert test employees (safe - won't create duplicates)
INSERT INTO employees (
  name, 
  email, 
  role, 
  status,
  contract_type, 
  rate_type, 
  hourly_rate, 
  overtime_rate,
  monthly_rate,
  position, 
  department, 
  onboarding_status, 
  contract_start_date
)
VALUES
  -- Test Employee
  (
    'Test Employee',
    'employee@test.com',
    'employee',
    'active',
    'Internal Project',
    'hourly',
    50.00,
    75.00,
    NULL,
    'Software Developer',
    'Engineering',
    'completed',
    '2024-01-01'
  ),
  -- Test Manager
  (
    'Test Manager',
    'manager@test.com',
    'manager',
    'active',
    'Internal Project',
    'hourly',
    75.00,
    100.00,
    NULL,
    'Engineering Manager',
    'Engineering',
    'completed',
    '2024-01-01'
  ),
  -- Test Admin
  (
    'Test Admin',
    'admin@test.com',
    'admin',
    'active',
    'Operational',
    'fixed',
    NULL,
    NULL,
    8000.00,
    'System Administrator',
    'Operations',
    'completed',
    '2024-01-01'
  )
ON CONFLICT (email) DO NOTHING; -- Prevents duplicates if emails already exist

-- 6. Verify the inserts
SELECT 
  id,
  name,
  email,
  role,
  status,
  rate_type,
  hourly_rate,
  monthly_rate
FROM employees
WHERE email IN ('employee@test.com', 'manager@test.com', 'admin@test.com')
ORDER BY role;

