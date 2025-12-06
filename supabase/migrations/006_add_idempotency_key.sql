-- Add idempotency_key column to submissions table
-- This prevents duplicate submissions from double-clicks or network retries

-- Add the column (nullable to not break existing records)
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Add a unique constraint on idempotency_key
-- This ensures each idempotency key can only be used once
CREATE UNIQUE INDEX IF NOT EXISTS submissions_idempotency_key_idx 
ON submissions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add a unique constraint on (employee_id, submission_month, submission_year)
-- This enforces the business rule: one submission per employee per month
-- First, create a function to extract month and year from submission_date
CREATE OR REPLACE FUNCTION get_submission_month_year(submission_date DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(submission_date, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a unique index for business rule enforcement
CREATE UNIQUE INDEX IF NOT EXISTS submissions_employee_month_year_idx
ON submissions(employee_id, (get_submission_month_year(submission_date)));

-- Comment on the new column
COMMENT ON COLUMN submissions.idempotency_key IS 'Unique key per submission attempt to prevent duplicates from double-clicks';

