-- Check what outcome values currently exist
SELECT DISTINCT outcome FROM interviews WHERE outcome IS NOT NULL;

-- Mark ALL interviews as won (regardless of current value)
UPDATE interviews SET outcome = 'Interview_Won';

-- Add constraint to ensure only valid statuses are used
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_outcome_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_outcome_check 
CHECK (outcome IS NULL OR outcome IN ('Interview_Won', 'Interview_Lost', 'Missed_Interview', 'Reschedule_Interview'));