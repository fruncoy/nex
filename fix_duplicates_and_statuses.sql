-- COMPREHENSIVE FIX: Handle duplicates and update statuses
-- Run this step by step

BEGIN;

-- STEP 1: Find duplicates
SELECT 
  'DUPLICATES FOUND' as step,
  name,
  phone,
  COUNT(*) as duplicate_count
FROM niche_training
WHERE phone IS NOT NULL
GROUP BY name, phone
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- STEP 2: Keep only the most recent record for duplicates, mark older ones
-- Create a temporary table with records to keep
DROP TABLE IF EXISTS temp_keep_records;
CREATE TEMP TABLE temp_keep_records AS
SELECT DISTINCT ON (phone) id
FROM niche_training
WHERE phone IS NOT NULL
ORDER BY phone, created_at DESC;

-- Show which records will be deleted (duplicates)
SELECT 
  'RECORDS TO DELETE (duplicates)' as step,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.cohort_id
FROM niche_training nt
WHERE nt.phone IS NOT NULL
  AND nt.id NOT IN (SELECT id FROM temp_keep_records)
ORDER BY nt.phone, nt.created_at;

-- STEP 3: Update statuses for cohorts 17 and below
-- Show what will be updated
SELECT 
  'RECORDS TO UPDATE TO EXPELLED' as step,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.status as old_status,
  'Expelled' as new_status
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status NOT IN ('Graduated', 'Expelled')
  AND (nt.training_type IS NULL OR nt.training_type != 'shortcourse')
  AND LOWER(nt.name) NOT LIKE '%jentix%'
  AND nt.id IN (SELECT id FROM temp_keep_records);

-- STEP 4: Execute the updates (UNCOMMENT TO RUN)

-- Delete duplicates
-- DELETE FROM niche_training
-- WHERE id NOT IN (SELECT id FROM temp_keep_records);

-- Update training statuses
-- UPDATE niche_training nt
-- SET status = 'Expelled'
-- FROM niche_cohorts nc
-- WHERE nt.cohort_id = nc.id
--   AND nc.cohort_number <= 17
--   AND nt.status NOT IN ('Graduated', 'Expelled')
--   AND (nt.training_type IS NULL OR nt.training_type != 'shortcourse')
--   AND LOWER(nt.name) NOT LIKE '%jentix%';

-- STEP 5: Sync to candidates
-- Show candidates that will be blacklisted
SELECT 
  'CANDIDATES TO BLACKLIST' as step,
  nc.id,
  nc.name,
  nc.phone,
  nc.status as old_status,
  'BLACKLISTED' as new_status
FROM niche_candidates nc
INNER JOIN niche_training nt ON 
  REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
INNER JOIN niche_cohorts coh ON nt.cohort_id = coh.id
WHERE nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- Update candidates (UNCOMMENT TO RUN)
-- UPDATE niche_candidates nc
-- SET status = 'BLACKLISTED'
-- FROM niche_training nt
-- INNER JOIN niche_cohorts coh ON nt.cohort_id = coh.id
-- WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
--   AND nt.status = 'Expelled'
--   AND nc.status != 'BLACKLISTED';

-- STEP 6: Verify results
SELECT 
  'FINAL STATUS CHECK' as step,
  nc.cohort_number,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
GROUP BY nc.cohort_number, nt.status
ORDER BY nc.cohort_number, nt.status;

ROLLBACK; -- Change to COMMIT when ready to apply changes
