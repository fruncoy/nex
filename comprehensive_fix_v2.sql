-- COMPREHENSIVE FIX
-- 1. Delete duplicates from niche_training
-- 2. Handle short course vs 2-week flagship statuses
-- 3. Expel everyone from cohort 17 and below who is not graduated
-- 4. Find Jentix (graduated but not graded)

BEGIN;

-- STEP 1: Find Jentix
SELECT 
  'JENTIX CHECK' as step,
  nt.id,
  nt.name,
  nt.status,
  nt.cohort_id,
  nc.cohort_number,
  nt.training_type
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE LOWER(nt.name) LIKE '%jentix%';

-- STEP 2: Delete duplicates (keep most recent)
-- First show duplicates
SELECT 
  'DUPLICATES TO DELETE' as step,
  nt.name,
  nt.phone,
  COUNT(*) as duplicate_count,
  array_agg(nt.id ORDER BY nt.created_at) as all_ids,
  array_agg(nt.status ORDER BY nt.created_at) as all_statuses
FROM niche_training nt
WHERE nt.phone IS NOT NULL
GROUP BY nt.name, nt.phone
HAVING COUNT(*) > 1;

-- Delete older duplicates, keep most recent
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

-- STEP 3: Check training_type field - which cohorts are short course vs 2-week
SELECT 
  'TRAINING TYPE BY COHORT' as step,
  nc.cohort_number,
  nt.training_type,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
GROUP BY nc.cohort_number, nt.training_type
ORDER BY nc.cohort_number;

-- STEP 4: For cohorts 17 and below that are 2-week flagship
-- Mark everyone as Expelled except graduated
SELECT 
  'WILL BE EXPELLED' as step,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.status as current_status,
  nt.training_type
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status != 'Graduated'
  AND (nt.training_type IS NULL OR nt.training_type IN ('2week', 'weekend'))
  AND LOWER(nt.name) NOT LIKE '%jentix%'
ORDER BY nc.cohort_number, nt.name;

-- Update to Expelled
UPDATE niche_training nt
SET status = 'Expelled'
FROM niche_cohorts nc
WHERE nt.cohort_id = nc.id
  AND nc.cohort_number <= 17
  AND nt.status != 'Graduated'
  AND (nt.training_type IS NULL OR nt.training_type IN ('2week', 'weekend'))
  AND LOWER(nt.name) NOT LIKE '%jentix%';

-- STEP 5: Handle short courses - they use "Completed" not "Expelled"
-- Short courses should keep Active/Completed status
-- Show short course records
SELECT 
  'SHORT COURSE RECORDS' as step,
  nt.name,
  nt.status,
  nc.cohort_number,
  nt.training_type
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.training_type = 'shortcourse'
ORDER BY nc.cohort_number, nt.name;

-- STEP 6: Find trainees without cohort
SELECT 
  'TRAINEES WITHOUT COHORT' as step,
  id,
  name,
  phone,
  status,
  training_type,
  created_at
FROM niche_training
WHERE cohort_id IS NULL
ORDER BY created_at DESC;

-- STEP 7: Sync candidates to BLACKLISTED
SELECT 
  'CANDIDATES TO BLACKLIST' as step,
  nc.id,
  nc.name,
  nc.phone,
  nc.status as current_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- Update candidates
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- STEP 8: Final verification
SELECT 
  'FINAL STATUS DISTRIBUTION' as step,
  nc.cohort_number,
  nt.training_type,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
GROUP BY nc.cohort_number, nt.training_type, nt.status
ORDER BY nc.cohort_number, nt.training_type, nt.status;

-- Check total expelled
SELECT 
  'TOTAL EXPELLED' as step,
  COUNT(*) as count
FROM niche_training
WHERE status = 'Expelled';

-- Check total blacklisted
SELECT 
  'TOTAL BLACKLISTED CANDIDATES' as step,
  COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED';

ROLLBACK; -- Change to COMMIT to apply changes
