-- Update NICHE Candidates statuses with new options
-- Add new statuses and update existing data

BEGIN;

-- Step 1: Drop existing constraint and add new one with updated statuses
ALTER TABLE niche_candidates 
DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

ALTER TABLE niche_candidates 
ADD CONSTRAINT niche_candidates_status_check 
CHECK (status IN (
  'New Inquiry',                -- Changed from 'Pending'
  'Interview Scheduled',        -- Same
  'Lost - No Show Interview',   -- Same
  'Lost - Failed Interview',    -- Same
  'Lost - Age',                 -- Same
  'Lost - No References',       -- Same
  'Lost - No Response',         -- Same
  'Lost - Good Conduct',        -- NEW
  'Lost - Experience',          -- NEW
  'Pending Outcome',            -- NEW (green - qualified but lacks something)
  'Qualified',                  -- Changed from 'Pending Cohort'
  'Active in Training',         -- Same
  'Graduated',                  -- Same
  'BLACKLISTED'                 -- Same (includes expelled)
));

-- Step 2: Update existing data with new status names
UPDATE niche_candidates 
SET status = 'New Inquiry' 
WHERE status = 'Pending';

UPDATE niche_candidates 
SET status = 'Qualified' 
WHERE status = 'Pending Cohort';

-- Step 3: Show the updated status breakdown
SELECT 
  'Updated status breakdown' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Step 4: Verify the constraint is working
SELECT 
  'Status constraint updated successfully' as result,
  COUNT(*) as total_candidates
FROM niche_candidates;

COMMIT;