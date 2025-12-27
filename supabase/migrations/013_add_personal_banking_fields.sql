-- =====================================================
-- Add Personal Information and Banking Fields
-- =====================================================
-- This migration adds fields for employee personal
-- information and banking details used in onboarding
-- =====================================================

-- Add personal information fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS state_parish TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add banking information fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_address TEXT,
ADD COLUMN IF NOT EXISTS swift_code TEXT,
ADD COLUMN IF NOT EXISTS aba_wire_routing TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Add comments for clarity
COMMENT ON COLUMN employees.address IS 'Employee residential address';
COMMENT ON COLUMN employees.state_parish IS 'State or parish';
COMMENT ON COLUMN employees.country IS 'Country of residence';
COMMENT ON COLUMN employees.zip_code IS 'Postal/ZIP code';
COMMENT ON COLUMN employees.phone IS 'Contact phone number';
COMMENT ON COLUMN employees.bank_name IS 'Bank name for payments';
COMMENT ON COLUMN employees.bank_address IS 'Bank address';
COMMENT ON COLUMN employees.swift_code IS 'SWIFT/BIC code';
COMMENT ON COLUMN employees.aba_wire_routing IS 'ABA/Wire routing number';
COMMENT ON COLUMN employees.account_type IS 'Account type (checking/savings)';
COMMENT ON COLUMN employees.currency IS 'Payment currency';
COMMENT ON COLUMN employees.account_number IS 'Bank account number';

-- =====================================================
-- Migration Complete! ✅
-- =====================================================

