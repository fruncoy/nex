-- Check what happened to people from cohort 17 and below who are NOT graduated
-- According to user: anyone not graduated was expelled (except Jentix)

-- First, get all cohorts and their graduation rates
SELECT 
  'Cohort graduation summary' as info,
  nc.cohort_number,
  COUNT(*) as total_trainees,
  COUNT(CASE WHEN nt.status = 'Graduated' THEN 1 END) as graduated,
  COUNT(*) - COUNT(CASE WHEN nt.status = 'Graduated' THEN 1 END) as not_graduated
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.cohort_id IS NOT NULL
GROUP BY nc.cohort_number
ORDER BY nc.cohort_number;

-- Now check the non-graduated people from cohort 17 and below
SELECT 
  'Non-graduated from cohort 17 and below' as info,
  nc.cohort_number,
  nt.name,
  nt.status as training_status,
  ncand.status as candidate_status,
  nt.phone as training_phone
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE nc.cohort_number <= 17
  AND nt.status != 'Graduated'
ORDER BY nc.cohort_number, nt.name;

-- Check specifically for "Active" or "Pending" status in older cohorts
SELECT 
  'Active/Pending in old cohorts' as info,
  nc.cohort_number,
  nt.status,
  COUNT(*) as count
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status IN ('Active', 'Pending', 'Completed')
GROUP BY nc.cohort_number, nt.status
ORDER BY nc.cohort_number, nt.status;

-- Check Jentix specifically
SELECT 
  'Jentix record' as info,
  nt.*,
  nc.cohort_number,
  ncand.status as candidate_status
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE LOWER(nt.name) LIKE '%jentix%';
