-- DIAGNOSE: Why only 2 expelled when we expected many more?

-- Check 1: How many people in cohort 17 and below?
SELECT 
  'COHORT 17 AND BELOW COUNT' as check_type,
  nc.cohort_number,
  nt.training_type,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17 OR nc.cohort_number IS NULL
GROUP BY nc.cohort_number, nt.training_type, nt.status
ORDER BY nc.cohort_number NULLS LAST, nt.status;

-- Check 2: Are there people with null cohort_id?
SELECT 
  'PEOPLE WITHOUT COHORT' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'Graduated' THEN 1 END) as graduated,
  COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'Expelled' THEN 1 END) as expelled
FROM niche_training
WHERE cohort_id IS NULL;

-- Check 3: What training_type values exist?
SELECT 
  'TRAINING TYPES' as check_type,
  training_type,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type
ORDER BY count DESC;

-- Check 4: List ALL people from cohort 17 and below with their status
SELECT 
  'ALL FROM COHORT 17 AND BELOW' as check_type,
  nc.cohort_number,
  nt.name,
  nt.status,
  nt.training_type,
  nc.cohort_number as cohort_num
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
ORDER BY nc.cohort_number, nt.name;

-- Check 5: How many duplicates were deleted?
SELECT 
  'BEFORE vs AFTER' as check_type,
  (SELECT COUNT(*) FROM niche_training) as current_total,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Expelled') as current_expelled,
  (SELECT COUNT(*) FROM niche_candidates WHERE status = 'BLACKLISTED') as current_blacklisted;
