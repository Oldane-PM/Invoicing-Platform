-- Add fixed income support to employees table
-- This migration adds rate_type, monthly_rate, and overtime_rate columns

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'fixed')),
ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10, 2);

-- Update existing employees to have a default rate_type of 'hourly' if they have an hourly_rate
UPDATE employees 
SET rate_type = 'hourly' 
WHERE hourly_rate IS NOT NULL AND rate_type IS NULL;

-- Add helpful comments
COMMENT ON COLUMN employees.rate_type IS 'Employee compensation type: hourly or fixed monthly';
COMMENT ON COLUMN employees.monthly_rate IS 'Fixed monthly payment amount (used when rate_type = fixed)';
COMMENT ON COLUMN employees.overtime_rate IS 'Overtime hourly rate (used when rate_type = hourly)';

-- Create index for rate_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_employees_rate_type ON employees(rate_type);

