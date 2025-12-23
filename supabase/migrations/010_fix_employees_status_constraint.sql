-- Fix employees status check constraint to allow proper status values
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_status_check;

-- Create new constraint with proper allowed values (case-insensitive)
-- Allowed values: ACTIVE, INACTIVE, PENDING, SUSPENDED, active, inactive, pending, suspended
ALTER TABLE employees ADD CONSTRAINT employees_status_check 
  CHECK (status IS NULL OR status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'active', 'inactive', 'pending', 'suspended'));

-- Set default value for status column
ALTER TABLE employees ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Update any NULL status values to ACTIVE
UPDATE employees SET status = 'ACTIVE' WHERE status IS NULL;

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'employees'::regclass 
AND conname = 'employees_status_check';

