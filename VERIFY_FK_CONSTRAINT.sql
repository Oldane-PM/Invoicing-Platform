-- Verify the actual FK constraint name for reporting_manager_id
-- Run this in Supabase SQL Editor

-- Check all foreign key constraints on employees table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'employees'
    AND kcu.column_name = 'reporting_manager_id';

-- If the above returns the constraint name, use it in your query like:
-- reporting_manager:employees!<constraint_name_here> (id, name, email)

-- Example expected output:
-- constraint_name: employees_reporting_manager_id_fkey
-- column_name: reporting_manager_id
-- foreign_table_name: employees
-- foreign_column_name: id

