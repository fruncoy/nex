-- Fix good conduct status constraint to match form options
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS chk_good_conduct_status;

-- Add updated constraint with correct values
ALTER TABLE candidates ADD CONSTRAINT chk_good_conduct_status 
CHECK (good_conduct_status IN ('Valid Certificate', 'Application Receipt', 'Expired', 'None') OR good_conduct_status IS NULL);