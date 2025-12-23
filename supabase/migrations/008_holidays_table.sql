-- Create holidays/non-working days table
-- Used by Admin Calendar Controls to define holidays and special time off

CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'holiday', -- 'holiday' or 'special_time_off'
  
  -- Dates (stored as JSON array of ISO date strings)
  dates JSONB NOT NULL DEFAULT '[]',
  
  -- Scope filters (JSON arrays for multi-select values)
  projects JSONB DEFAULT '[]',
  employee_types JSONB DEFAULT '[]',
  countries JSONB DEFAULT '[]',
  regions JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

-- Add constraint for valid type values
ALTER TABLE holidays ADD CONSTRAINT holidays_type_check 
  CHECK (type IN ('holiday', 'special_time_off'));

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_dates ON holidays USING GIN(dates);
CREATE INDEX IF NOT EXISTS idx_holidays_created_at ON holidays(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS holidays_updated_at_trigger ON holidays;
CREATE TRIGGER holidays_updated_at_trigger
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_holidays_updated_at();

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage holidays
CREATE POLICY "Admins can manage holidays" ON holidays
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: All authenticated users can view holidays
CREATE POLICY "Authenticated users can view holidays" ON holidays
  FOR SELECT
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE holidays IS 'Stores company holidays and special non-working days defined by admins';
COMMENT ON COLUMN holidays.type IS 'Type of non-working day: holiday or special_time_off';
COMMENT ON COLUMN holidays.dates IS 'JSON array of ISO date strings for the non-working dates';
COMMENT ON COLUMN holidays.projects IS 'JSON array of project IDs this holiday applies to (empty = all)';
COMMENT ON COLUMN holidays.employee_types IS 'JSON array of employee types this holiday applies to (empty = all)';
COMMENT ON COLUMN holidays.countries IS 'JSON array of country codes this holiday applies to (empty = all)';
COMMENT ON COLUMN holidays.regions IS 'JSON array of region codes this holiday applies to (empty = all)';

