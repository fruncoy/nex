-- Simple fix: Reset the constraint completely

BEGIN;

-- Step 1: Drop existing constraint
ALTER TABLE niche_candidates 
DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

-- Step 2: Update any old status values
UPDATE niche_candidates 
SET status = 'New Inquiry' 
WHERE status = 'Pending';

UPDATE niche_candidates 
SET status = 'Qualified' 
WHERE status = 'Pending Cohort';

-- Step 3: Add the new constraint with ALL the statuses
ALTER TABLE niche_candidates 
ADD CONSTRAINT niche_candidates_status_check 
CHECK (status IN (
  'New Inquiry',
  'Interview Scheduled',
  'Lost - No Show Interview',
  'Lost - Failed Interview',
  'Lost - Age',
  'Lost - No References',
  'Lost - No Response',
  'Lost - Good Conduct',
  'Lost - Experience',
  'Lost - Other',
  'Pending Outcome',
  'Qualified',
  'Active in Training',
  'Graduated',
  'BLACKLISTED'
));

-- Step 4: Show current statuses
SELECT 
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY status;

COMMIT;