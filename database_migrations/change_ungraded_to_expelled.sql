-- Change 14 graduates without grades to Expelled
-- EXCEPT Jentrix who is the legitimate exception

BEGIN;

-- Show what will be changed
SELECT 
  'Will change to Expelled' as action,
  nt.name,
  nc.cohort_number,
  nt.status as current_status,
  'Expelled' as new_status
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN trainee_grades tg ON nt.id = tg.trainee_id
WHERE nt.training_type = '2week'
  AND nt.status = 'Graduated'
  AND tg.id IS NULL
  AND LOWER(nt.name) NOT LIKE '%jentrix%'
ORDER BY nc.cohort_number, nt.name;

-- Update to Expelled
UPDATE niche_training nt
SET status = 'Expelled'
FROM niche_cohorts nc
WHERE nt.cohort_id = nc.id
  AND nt.training_type = '2week'
  AND nt.status = 'Graduated'
  AND NOT EXISTS (
    SELECT 1 FROM trainee_grades tg WHERE tg.trainee_id = nt.id
  )
  AND LOWER(nt.name) NOT LIKE '%jentrix%';

-- Update candidates to BLACKLISTED
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
WHERE REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g')
  AND nt.training_type = '2week'
  AND nt.status = 'Expelled'
  AND nc.status != 'BLACKLISTED';

-- Verify Jentix is still Graduated
SELECT 
  'Jentix Status' as check_type,
  nt.name,
  nt.status,
  nc.cohort_number
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE LOWER(nt.name) LIKE '%jentrix%';

-- Show final count
SELECT 
  'Final Status Distribution' as check_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Show total expelled
SELECT 
  'Total Expelled' as check_type,
  COUNT(*) as count
FROM niche_training
WHERE status = 'Expelled';

-- Show total blacklisted
SELECT 
  'Total Blacklisted Candidates' as check_type,
  COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED';

COMMIT;
