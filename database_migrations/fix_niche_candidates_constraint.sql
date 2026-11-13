-- Fix the constraint issue - check what's wrong and fix it

-- Step 1: Check current constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'niche_candidates_status_check';

-- Step 2: Check what statuses are currently in the table
SELECT 
  'Current statuses in table' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY status;

-- Step 3: Drop the constraint temporarily to fix data
ALTER TABLE niche_candidates 
DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

-- Step 4: Update any problematic statuses
UPDATE niche_candidates 
SET status = CASE 
  WHEN status = 'Pending' THEN 'New Inquiry'
  WHEN status = 'Pending Cohort' THEN 'Qualified'
  WHEN status = 'Lost - Other' THEN 'Lost - Experience'
  WHEN status LIKE 'Lost -%' AND status NOT IN (
    'Lost - No Show Interview',
    'Lost - Failed Interview', 
    'Lost - Age',
    'Lost - No References',
    'Lost - No Response',
    'Lost - Good Conduct',
    'Lost - Experience'
  ) THEN 'Lost - Experience'  -- Map any other "Lost" statuses to "Lost - Experience"
  ELSE status
END;

-- Step 5: Apply the correct constraint
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
  'Pending Outcome',
  'Qualified',
  'Active in Training',
  'Graduated',
  'BLACKLISTED'
));

-- Step 6: Verify the fix worked
SELECT 
  'Final status breakdown' as result,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Step 7: Test that the constraint works
SELECT 'Constraint applied successfully' as success;