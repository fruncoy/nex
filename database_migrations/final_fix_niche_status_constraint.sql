-- Final fix for niche_candidates status constraint
-- Drop existing constraint and recreate with all current statuses

-- Drop the existing constraint
ALTER TABLE niche_candidates DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

-- Add new constraint with all current statuses from your data
ALTER TABLE niche_candidates ADD CONSTRAINT niche_candidates_status_check 
CHECK (status IN (
    'New Inquiry',
    'Interview Scheduled', 
    'Qualified',
    'Active in Training',
    'Graduated',
    'BLACKLISTED',
    'Lost - No Response',
    'Lost - No Show Interview', 
    'Lost - Failed Interview',
    'Lost - No References',
    'Lost - Age',
    'Lost - Other'
));