-- COMPREHENSIVE SYNC: Ensure niche_candidates and niche_training stay synchronized
-- This script should be run periodically to maintain sync between the two tables

BEGIN;

-- CORRECT STATUS MAPPING REFERENCE:
-- Training "Pending" → Candidate "Pending Cohort" (passed interview, waiting for cohort)
-- Training "Active" → Candidate "Active in Training" (currently in training)
-- Training "Graduated" → Candidate "Graduated" (completed training)
-- Training "Expelled" → Candidate "BLACKLISTED" (expelled from training)
-- Training "Suspended" → Candidate "Lost - Other" (suspended from training)

-- Interview "Interview_Won" → Candidate "Pending Cohort" (won interview, waiting for cohort)
-- Interview "Interview_Lost" → Candidate "Lost - Failed Interview"
-- Interview "Missed_Interview" → Candidate "Lost - No Show Interview"

-- Step 1: Sync candidates based on training status
UPDATE niche_candidates nc
SET status = CASE 
  WHEN nt.status = 'Pending' THEN 'Qualified'           -- NEW MAPPING: Training Pending → Candidate Qualified
  WHEN nt.status = 'Active' THEN 'Active in Training'
  WHEN nt.status = 'Graduated' THEN 'Graduated'
  WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
  WHEN nt.status = 'Suspended' THEN 'BLACKLISTED'      -- Changed: Suspended also goes to BLACKLISTED
  ELSE nc.status
END
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.phone IS NOT NULL
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
  AND nc.status != CASE 
    WHEN nt.status = 'Pending' THEN 'Qualified'
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
    WHEN nt.status = 'Suspended' THEN 'BLACKLISTED'
    ELSE nc.status
  END;

-- Step 2: Sync candidates based on interview outcomes
UPDATE niche_candidates nc
SET status = CASE 
  WHEN ni.outcome = 'Interview_Won' THEN 'Qualified'                    -- NEW MAPPING: Interview Won → Qualified
  WHEN ni.outcome = 'Interview_Lost' THEN 'Lost - Failed Interview'
  WHEN ni.outcome = 'Missed_Interview' THEN 'Lost - No Show Interview'
  ELSE nc.status
END
FROM niche_interviews ni
WHERE nc.id = ni.niche_candidate_id
  AND ni.outcome IS NOT NULL
  AND nc.status != CASE 
    WHEN ni.outcome = 'Interview_Won' THEN 'Qualified'
    WHEN ni.outcome = 'Interview_Lost' THEN 'Lost - Failed Interview'
    WHEN ni.outcome = 'Missed_Interview' THEN 'Lost - No Show Interview'
    ELSE nc.status
  END;

-- Step 3: Handle candidates who are both in training AND have interview records
-- Training status takes precedence over interview outcome
UPDATE niche_candidates nc
SET status = CASE 
  WHEN nt.status = 'Active' THEN 'Active in Training'     -- Training active overrides interview won
  WHEN nt.status = 'Graduated' THEN 'Graduated'          -- Training graduated overrides interview won
  WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'         -- Training expelled overrides everything
  ELSE nc.status
END
FROM niche_training nt
INNER JOIN niche_interviews ni ON EXISTS (
  SELECT 1 FROM niche_candidates nc2 
  WHERE nc2.id = ni.niche_candidate_id 
  AND nc2.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
)
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status IN ('Active', 'Graduated', 'Expelled')
  AND nt.phone IS NOT NULL;

-- Verification and Results
SELECT 'SYNC VERIFICATION' as phase;

-- Show the correct mapping in action
SELECT 
  'CORRECT STATUS MAPPING' as info,
  nt.status as training_status,
  nc.status as candidate_status,
  COUNT(*) as count
FROM niche_training nt
INNER JOIN niche_candidates nc ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.phone IS NOT NULL
GROUP BY nt.status, nc.status
ORDER BY count DESC;

-- Show interview outcomes mapping
SELECT 
  'INTERVIEW OUTCOME MAPPING' as info,
  ni.outcome as interview_outcome,
  nc.status as candidate_status,
  COUNT(*) as count
FROM niche_interviews ni
INNER JOIN niche_candidates nc ON nc.id = ni.niche_candidate_id
WHERE ni.outcome IS NOT NULL
GROUP BY ni.outcome, nc.status
ORDER BY count DESC;

-- Final status breakdown
SELECT 
  'FINAL CANDIDATE STATUS BREAKDOWN' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Show candidates with "Pending Cohort" status (should be interview winners waiting for cohort)
SELECT 
  'PENDING COHORT CANDIDATES' as info,
  nc.name,
  nc.phone,
  nc.status,
  ni.outcome as interview_outcome,
  nt.status as training_status
FROM niche_candidates nc
LEFT JOIN niche_interviews ni ON nc.id = ni.niche_candidate_id
LEFT JOIN niche_training nt ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nc.status = 'Pending Cohort'
ORDER BY nc.created_at DESC
LIMIT 10;

COMMIT;