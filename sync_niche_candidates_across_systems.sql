-- Sync candidates between NICHE Training, Interviews, and Candidates tables
-- Ensure no duplicates and accurate statuses

-- 1. ANALYSIS: Check current state across all three systems

-- Candidates in training but not in candidates table
SELECT 
  'Training candidates NOT in candidates table' as issue,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.phone = nc.phone
WHERE nc.id IS NULL;

-- Candidates in interviews but not in candidates table  
SELECT 
  'Interview candidates NOT in candidates table' as issue,
  COUNT(*) as count
FROM niche_interviews ni
JOIN niche_candidates nc_temp ON ni.niche_candidate_id = nc_temp.id
LEFT JOIN niche_candidates nc ON nc_temp.phone = nc.phone
WHERE nc.id IS NULL;

-- Show sample training candidates missing from candidates table
SELECT 
  'Sample training candidates missing' as info,
  nt.name,
  nt.phone,
  nt.status as training_status,
  nt.cohort_id
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.phone = nc.phone
WHERE nc.id IS NULL
ORDER BY nt.created_at DESC
LIMIT 10;

-- 2. STATUS SYNCHRONIZATION ANALYSIS

-- Compare statuses between training and candidates
SELECT 
  'Status comparison - Training vs Candidates' as analysis,
  nt.status as training_status,
  nc.status as candidate_status,
  COUNT(*) as count
FROM niche_training nt
INNER JOIN niche_candidates nc ON nt.phone = nc.phone
WHERE nt.status != nc.status
GROUP BY nt.status, nc.status
ORDER BY count DESC;

-- Interview outcomes vs candidate statuses
SELECT 
  'Status comparison - Interviews vs Candidates' as analysis,
  ni.outcome as interview_outcome,
  nc.status as candidate_status,
  COUNT(*) as count
FROM niche_interviews ni
INNER JOIN niche_candidates nc ON ni.niche_candidate_id = nc.id
WHERE (
  (ni.outcome = 'Interview_Won' AND nc.status NOT IN ('Graduated', 'Active in Training')) OR
  (ni.outcome = 'Interview_Lost' AND nc.status NOT LIKE 'Lost - Failed Interview') OR
  (ni.outcome = 'Missed_Interview' AND nc.status NOT LIKE 'Lost - No Show Interview')
)
GROUP BY ni.outcome, nc.status
ORDER BY count DESC;

-- 3. PHONE NUMBER DUPLICATES CHECK
SELECT 
  'Phone duplicates in candidates' as issue,
  phone,
  COUNT(*) as duplicate_count
FROM niche_candidates
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 4. MISSING CANDIDATES THAT NEED TO BE ADDED

-- Training candidates that should be in candidates table
SELECT 
  'Training candidates to ADD to candidates table' as action,
  nt.name,
  nt.phone,
  nt.status,
  nt.cohort_id,
  nt.created_at
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.phone = nc.phone
WHERE nc.id IS NULL
  AND nt.phone IS NOT NULL
  AND nt.phone != ''
ORDER BY nt.created_at DESC;

-- UNCOMMENT BELOW TO EXECUTE THE SYNC
/*
BEGIN;

-- Step 1: Insert missing candidates from training table
INSERT INTO niche_candidates (
  name, phone, source, inquiry_date, status, created_at, added_by
)
SELECT DISTINCT
  nt.name,
  nt.phone,
  'NICHE Training' as source,
  COALESCE(nt.created_at::date, CURRENT_DATE) as inquiry_date,
  CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    ELSE nt.status
  END as status,
  nt.created_at,
  'SYSTEM_SYNC' as added_by
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.phone = nc.phone
WHERE nc.id IS NULL
  AND nt.phone IS NOT NULL
  AND nt.phone != ''
  AND nt.name IS NOT NULL;

-- Step 2: Update candidate statuses based on training status
UPDATE niche_candidates nc
SET status = CASE 
  WHEN nt.status = 'Active' THEN 'Active in Training'
  WHEN nt.status = 'Graduated' THEN 'Graduated'
  WHEN nt.status = 'Expelled' THEN 'Lost - Other'
  ELSE nt.status
END
FROM niche_training nt
WHERE nc.phone = nt.phone
  AND nc.status != CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    ELSE nt.status
  END;

-- Step 3: Update candidate statuses based on interview outcomes
UPDATE niche_candidates nc
SET status = CASE 
  WHEN ni.outcome = 'Interview_Won' AND nc.status NOT IN ('Graduated', 'Active in Training') THEN 'Graduated'
  WHEN ni.outcome = 'Interview_Lost' THEN 'Lost - Failed Interview'
  WHEN ni.outcome = 'Missed_Interview' THEN 'Lost - No Show Interview'
  ELSE nc.status
END
FROM niche_interviews ni
WHERE nc.id = ni.niche_candidate_id
  AND ni.outcome IS NOT NULL;

-- Step 4: Remove duplicate candidates (keep the most recent one)
WITH duplicate_phones AS (
  SELECT phone, MIN(id) as keep_id
  FROM niche_candidates
  WHERE phone IN (
    SELECT phone 
    FROM niche_candidates 
    GROUP BY phone 
    HAVING COUNT(*) > 1
  )
  GROUP BY phone
)
DELETE FROM niche_candidates nc
WHERE nc.phone IN (SELECT phone FROM duplicate_phones)
  AND nc.id NOT IN (SELECT keep_id FROM duplicate_phones);

-- Final verification
SELECT 
  'SYNC COMPLETED' as status,
  COUNT(*) as total_candidates
FROM niche_candidates;

SELECT 
  'Phone duplicates remaining' as check_result,
  COUNT(*) as duplicates
FROM (
  SELECT phone
  FROM niche_candidates
  GROUP BY phone
  HAVING COUNT(*) > 1
) dups;

COMMIT;
*/