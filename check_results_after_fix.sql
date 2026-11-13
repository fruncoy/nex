-- Check results after the fix

-- 1. Total expelled in training
SELECT 
  'Total Expelled in Training' as check_type,
  COUNT(*) as count
FROM niche_training
WHERE status = 'Expelled';

-- 2. Total blacklisted in candidates
SELECT 
  'Total Blacklisted Candidates' as check_type,
  COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED';

-- 3. Check for remaining duplicates
SELECT 
  'Remaining Duplicates' as check_type,
  COUNT(*) as duplicate_count
FROM (
  SELECT phone
  FROM niche_training
  WHERE phone IS NOT NULL
  GROUP BY phone
  HAVING COUNT(*) > 1
) t;

-- 4. Find Jentix
SELECT 
  'Jentix Check' as check_type,
  nt.id,
  nt.name,
  nt.status,
  nc.cohort_number
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE LOWER(nt.name) LIKE '%jentix%';

-- 5. Status distribution
SELECT 
  'Status Distribution' as check_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- 6. Show all expelled trainees
SELECT 
  'All Expelled Trainees' as info,
  nt.name,
  nc.cohort_number,
  ncand.status as candidate_status
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
ORDER BY nc.cohort_number NULLS LAST, nt.name;
