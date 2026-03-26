-- EXECUTE NICHE CANDIDATES SYNC (Fixed for duplicates)
-- This will add training candidates to the candidates table, handling existing phone numbers

BEGIN;

-- Step 1: Clean and insert missing candidates from training table (avoiding duplicates)
INSERT INTO niche_candidates (
  name, phone, source, inquiry_date, status, created_at, added_by
)
SELECT DISTINCT
  nt.name,
  -- Clean phone numbers (remove invalid entries)
  CASE 
    WHEN nt.phone ~ '^[+0-9\s\-\(\)tel:]+$' AND LENGTH(TRIM(nt.phone)) >= 10 THEN 
      REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
    ELSE NULL
  END as phone,
  'NICHE Training' as source,
  COALESCE(nt.created_at::date, CURRENT_DATE) as inquiry_date,
  CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    WHEN nt.status = 'Pending' THEN 'Pending'
    ELSE nt.status
  END as status,
  nt.created_at,
  'SYSTEM_SYNC' as added_by
FROM niche_training nt
WHERE nt.name IS NOT NULL
  AND nt.name != ''
  -- Filter out obvious data quality issues
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  -- Only insert if phone doesn't already exist in candidates table
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc 
    WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  )
  -- Only insert if this exact training record isn't already represented
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc 
    WHERE nc.name = nt.name 
    AND nc.added_by = 'SYSTEM_SYNC'
  );

-- Step 2: Update existing candidate statuses based on training status (for candidates with matching phones)
UPDATE niche_candidates nc
SET status = CASE 
  WHEN nt.status = 'Active' THEN 'Active in Training'
  WHEN nt.status = 'Graduated' THEN 'Graduated'
  WHEN nt.status = 'Expelled' THEN 'Lost - Other'
  WHEN nt.status = 'Pending' THEN 'Pending'
  ELSE nt.status
END
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.phone IS NOT NULL
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND nc.status != CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    WHEN nt.status = 'Pending' THEN 'Pending'
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

-- Final verification and results
SELECT 
  'SYNC COMPLETED' as status,
  COUNT(*) as total_candidates_after_sync
FROM niche_candidates;

-- Show how many were added vs updated
SELECT 
  'Candidates added from training' as info,
  COUNT(*) as newly_added
FROM niche_candidates
WHERE added_by = 'SYSTEM_SYNC';

-- Show breakdown by status
SELECT 
  'Final candidate status breakdown' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Show training candidates that already existed (were updated instead of added)
SELECT 
  'Training candidates that already existed' as info,
  nc.name,
  nc.phone,
  nc.status,
  nt.status as training_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nc.added_by != 'SYSTEM_SYNC'
  AND nt.phone IS NOT NULL
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
ORDER BY nc.name
LIMIT 10;

-- Show recently added candidates from training
SELECT 
  'Recently added from training' as info,
  name,
  phone,
  status,
  inquiry_date
FROM niche_candidates
WHERE added_by = 'SYSTEM_SYNC'
ORDER BY created_at DESC
LIMIT 10;

COMMIT;