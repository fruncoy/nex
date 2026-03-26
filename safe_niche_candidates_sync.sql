-- SAFE NICHE CANDIDATES SYNC - Handle all duplicates properly
-- First analyze, then sync without errors

BEGIN;

-- Step 1: Show what we're working with
SELECT 'ANALYSIS - Before Sync' as phase;

-- Check for duplicates within training data itself
SELECT 
  'Duplicates within training data' as issue,
  REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') as cleaned_phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ', ') as names
FROM niche_training
WHERE phone IS NOT NULL 
  AND phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
GROUP BY REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g')
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check which training phones already exist in candidates
SELECT 
  'Training phones already in candidates' as issue,
  COUNT(*) as existing_count
FROM niche_training nt
INNER JOIN niche_candidates nc ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.phone IS NOT NULL 
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther');

-- Step 2: Update existing candidates first (no risk of duplicates)
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
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther');

-- Step 3: Insert only truly new candidates (using DISTINCT and careful filtering)
WITH cleaned_training AS (
  SELECT DISTINCT ON (REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'))
    name,
    REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') as cleaned_phone,
    status,
    created_at
  FROM niche_training
  WHERE phone IS NOT NULL 
    AND phone NOT IN ('Makawi', 'Oganga', 'Kerry')
    AND name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
    AND REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') ~ '^[+0-9\s\-\(\)]+$'
    AND LENGTH(REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g')) >= 10
  ORDER BY REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'), created_at DESC
)
INSERT INTO niche_candidates (
  name, phone, source, inquiry_date, status, created_at, added_by
)
SELECT 
  ct.name,
  ct.cleaned_phone,
  'NICHE Training' as source,
  COALESCE(ct.created_at::date, CURRENT_DATE) as inquiry_date,
  CASE 
    WHEN ct.status = 'Active' THEN 'Active in Training'
    WHEN ct.status = 'Graduated' THEN 'Graduated'
    WHEN ct.status = 'Expelled' THEN 'Lost - Other'
    WHEN ct.status = 'Pending' THEN 'Pending'
    ELSE ct.status
  END as status,
  ct.created_at,
  'SYSTEM_SYNC' as added_by
FROM cleaned_training ct
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc 
  WHERE nc.phone = ct.cleaned_phone
);

-- Step 4: Update candidate statuses based on interview outcomes
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

-- Final Results
SELECT 'SYNC RESULTS' as phase;

SELECT 
  'Total candidates after sync' as info,
  COUNT(*) as total_candidates
FROM niche_candidates;

SELECT 
  'Candidates added from training' as info,
  COUNT(*) as newly_added
FROM niche_candidates
WHERE added_by = 'SYSTEM_SYNC';

SELECT 
  'Status breakdown after sync' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Show some examples of what was added
SELECT 
  'Sample newly added candidates' as info,
  name,
  phone,
  status
FROM niche_candidates
WHERE added_by = 'SYSTEM_SYNC'
ORDER BY created_at DESC
LIMIT 5;

COMMIT;