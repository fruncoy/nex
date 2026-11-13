-- FIX ALL ISSUES - THIS WILL ACTUALLY COMMIT THE CHANGES
-- Run this step by step and verify

BEGIN;

-- STEP 1: Delete duplicates (keep most recent)
DELETE FROM niche_training
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at DESC) as rn
    FROM niche_training
    WHERE phone IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Verify duplicates deleted
SELECT 
  'After duplicate deletion' as step,
  COUNT(*) as total,
  COUNT(DISTINCT phone) as unique_phones
FROM niche_training
WHERE phone IS NOT NULL;

-- STEP 2: Delete Keziah (no cohort)
DELETE FROM niche_training
WHERE id = 'ff9cd3df-7a71-462e-8bfc-92bfff978cf0';

-- STEP 3: Update cohort 17 and below to Expelled
-- First show what will be changed
SELECT 
  'Will update to Expelled' as action,
  nt.name,
  nc.cohort_number,
  nt.status as old_status
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status NOT IN ('Graduated', 'Expelled')
  AND (nt.training_type IS NULL OR nt.training_type IN ('2week', 'weekend'))
  AND LOWER(nt.name) NOT LIKE '%jentix%';

-- Now update them
UPDATE niche_training nt
SET status = 'Expelled'
FROM niche_cohorts nc
WHERE nt.cohort_id = nc.id
  AND nc.cohort_number <= 17
  AND nt.status NOT IN ('Graduated', 'Expelled')
  AND (nt.training_type IS NULL OR nt.training_type IN ('2week', 'weekend'))
  AND LOWER(nt.name) NOT LIKE '%jentix%';

-- STEP 4: Update candidates to BLACKLISTED
-- Show what will be updated
SELECT 
  'Will blacklist candidates' as action,
  nc.name,
  nc.status as old_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- Update them
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- STEP 5: Final verification
SELECT 
  'FINAL STATUS' as step,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
GROUP BY nt.status
ORDER BY count DESC;

-- Check total expelled
SELECT 
  'Total Expelled' as check_type,
  COUNT(*) as count
FROM niche_training
WHERE status = 'Expelled';

-- Check total blacklisted
SELECT 
  'Total Blacklisted Candidates' as check_type,
  COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED';

-- Commit the changes!
COMMIT;
