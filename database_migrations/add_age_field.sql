-- Add age field to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS age INTEGER;

-- Update existing records to calculate age from place_of_birth (if it contains date)
-- This is a one-time update for existing records
UPDATE candidates 
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, place_of_birth::date))
WHERE place_of_birth IS NOT NULL 
AND place_of_birth ~ '^\d{4}-\d{2}-\d{2}$'
AND age IS NULL;