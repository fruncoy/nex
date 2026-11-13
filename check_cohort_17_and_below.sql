-- Check cohort 17 and below - what happened to trainees who didn't graduate?
SELECT 
  'All statuses in training' as info,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Check cohorts
SELECT 
  'Cohorts in training' as info,
  cohort_id,
  COUNT(*) as total_trainees,
  COUNT(CASE WHEN status = 'Graduated' THEN 1 END) as graduated,
  COUNT(CASE WHEN status = 'Expelled' THEN 1 END) as expelled,
  COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status NOT IN ('Graduated', 'Expelled', 'Active', 'Pending') THEN 1 END) as other_status
FROM niche_training
GROUP BY cohort_id
ORDER BY cohort_id;

-- Check who are the trainees in cohort 17 and below who are NOT graduated
SELECT 
  'Non-graduated from cohort 17 and below' as info,
  nt.cohort_id,
  nc.name,
  nt.status as training_status,
  nc.status as candidate_status,
  nt.phone as training_phone,
  nc.phone as candidate_phone
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.cohort_id IS NOT NULL 
  AND nt.cohort_id <= 17
  AND nt.status != 'Graduated'
ORDER BY nt.cohort_id, nt.name;

-- Check if there's a "Completed" status or other status
SELECT 
  'Detailed status check' as info,
  nt.status,
  COUNT(*) as count,
  array_agg(DISTINCT nt.cohort_id) as cohorts
FROM niche_training nt
WHERE nt.cohort_id IS NOT NULL AND nt.cohort_id <= 17
GROUP BY nt.status
ORDER BY count DESC;
