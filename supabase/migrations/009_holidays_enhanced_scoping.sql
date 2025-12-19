-- Enhanced holidays table with better scoping support
-- Adds explicit "applies_to_all" flags for clearer logic

-- Add new columns for explicit scoping flags
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS applies_to_all_projects BOOLEAN DEFAULT true;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS applies_to_all_employee_types BOOLEAN DEFAULT true;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS applies_to_all_locations BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_holidays_is_active ON holidays(is_active) WHERE is_active = true;

-- Update existing records to set the new flags based on current data
UPDATE holidays 
SET 
  applies_to_all_projects = (projects IS NULL OR projects = '[]'::jsonb),
  applies_to_all_employee_types = (employee_types IS NULL OR employee_types = '[]'::jsonb),
  applies_to_all_locations = (countries IS NULL OR countries = '[]'::jsonb)
WHERE is_active IS NULL;

-- Set default for is_active
UPDATE holidays SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN holidays.is_active IS 'Whether this holiday is currently active';
COMMENT ON COLUMN holidays.is_paid IS 'Whether this is a paid day off';
COMMENT ON COLUMN holidays.applies_to_all_projects IS 'If true, applies to all projects; if false, uses projects array';
COMMENT ON COLUMN holidays.applies_to_all_employee_types IS 'If true, applies to all employee types; if false, uses employee_types array';
COMMENT ON COLUMN holidays.applies_to_all_locations IS 'If true, applies to all locations; if false, uses countries/regions arrays';

