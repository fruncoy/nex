-- Add "Pending Cohort" status and fix Interview Won workflow
-- Ensure proper sync between /niche-candidates and /niche-training

BEGIN;

-- Step 1: Drop existing constraint and add new one with "Pending Cohort"
ALTER TABLE niche_candidates 
DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

ALTER TABLE niche_candidates 
ADD CONSTRAINT niche_candidates_status_check 
CHECK (status IN (
  'Pending',                    -- Just inquired, no interview
  'Interview Scheduled',        -- Interview booked
  'Pending Cohort',            -- Interview won, waiting for cohort assignment ⭐ NEW
  'Active in Training',        -- Currently in training
  'Graduated',                 -- Completed training
  'Lost - No Show Interview',
  'Lost - Failed Interview', 
  'Lost - Age',
  'Lost - No References',
  'Lost - No Response',
  'Lost - Other',
  'BLACKLISTED'
));

-- Step 2: Update Interview Won candidates to "Pending Cohort" status
UPDATE niche_candidates nc
SET status = 'Pending Cohort'
FROM niche_interviews ni
WHERE nc.id = ni.niche_candidate_id
  AND ni.outcome = 'Interview_Won'
  AND nc.status IN ('Graduated', 'Active in Training'); -- Fix the ones we mapped incorrectly

-- Step 3: Update existing training "Pending" candidates to "Pending Cohort" in candidates table
UPDATE niche_candidates nc
SET status = 'Pending Cohort'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Pending'
  AND nc.status != 'Pending Cohort';

-- Step 4: Ensure candidates with "Active" training status are "Active in Training"
UPDATE niche_candidates nc
SET status = 'Active in Training'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Active'
  AND nc.status != 'Active in Training';

-- Step 5: Ensure candidates with "Graduated" training status are "Graduated"
UPDATE niche_candidates nc
SET status = 'Graduated'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Graduated'
  AND nc.status != 'Graduated';

-- Show results
SELECT 'STATUS UPDATE RESULTS' as phase;

-- Show Interview Won candidates now with "Pending Cohort" status
SELECT 
  'Interview Won → Pending Cohort' as info,
  COUNT(*) as count
FROM niche_candidates nc
INNER JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
WHERE ni.outcome = 'Interview_Won' AND nc.status = 'Pending Cohort';

-- Show training Pending → Pending Cohort mapping
SELECT 
  'Training Pending → Pending Cohort' as info,
  COUNT(*) as count
FROM niche_candidates nc
INNER JOIN niche_training nt ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.status = 'Pending' AND nc.status = 'Pending Cohort';

-- Final status breakdown with new "Pending Cohort" status
SELECT 
  'FINAL STATUS BREAKDOWN (with Pending Cohort)' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Show sync between niche_candidates and niche_training
SELECT 
  'SYNC STATUS: Candidates vs Training' as comparison,
  nt.status as training_status,
  nc.status as candidate_status,
  COUNT(*) as count
FROM niche_training nt
INNER JOIN niche_candidates nc ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
GROUP BY nt.status, nc.status
ORDER BY count DESC;

COMMIT;