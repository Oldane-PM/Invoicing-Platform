-- Add reporting_manager_id column to employees table
-- Run this in Supabase SQL Editor

-- Add the reporting_manager_id column (references another employee)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager 
ON employees(reporting_manager_id);

-- Add comment for documentation
COMMENT ON COLUMN employees.reporting_manager_id IS 'References the employee who is this employee''s reporting manager';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'reporting_manager_id';

