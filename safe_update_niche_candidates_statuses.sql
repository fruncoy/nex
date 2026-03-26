-- Safe update of NICHE Candidates statuses - Check existing data first
-- This will show what statuses exist and safely update them

BEGIN;

-- Step 1: Check what statuses currently exist
SELECT 
  'Current statuses in database' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Step 2: Update existing statuses to match new constraint
-- Map old statuses to new ones
UPDATE niche_candidates 
SET status = CASE 
  WHEN status = 'Pending' THEN 'New Inquiry'
  WHEN status = 'Pending Cohort' THEN 'Qualified'
  WHEN status = 'Lost - Other' THEN 'Lost - Experience'  -- Map generic "Other" to "Experience"
  ELSE status  -- Keep all other statuses as they are
END
WHERE status IN ('Pending', 'Pending Cohort', 'Lost - Other');

-- Step 3: Check if there are any remaining invalid statuses
SELECT 
  'Statuses that need manual review' as warning,
  status,
  COUNT(*) as count
FROM niche_candidates
WHERE status NOT IN (
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
)
GROUP BY status
ORDER BY count DESC;

-- Step 4: Only apply constraint if no invalid statuses remain
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Count invalid statuses
    SELECT COUNT(*) INTO invalid_count
    FROM niche_candidates
    WHERE status NOT IN (
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
    );
    
    IF invalid_count = 0 THEN
        -- Safe to apply new constraint
        ALTER TABLE niche_candidates 
        DROP CONSTRAINT IF EXISTS niche_candidates_status_check;
        
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
        
        RAISE NOTICE 'Constraint updated successfully!';
    ELSE
        RAISE NOTICE 'Cannot apply constraint - % invalid statuses found. Please review the "Statuses that need manual review" output above.', invalid_count;
    END IF;
END $$;

-- Step 5: Show final status breakdown
SELECT 
  'Final status breakdown' as result,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

COMMIT;