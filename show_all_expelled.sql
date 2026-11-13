-- Show ALL expelled trainees and their details
SELECT 
  'ALL EXPELLED TRAINEES' as info,
  nt.id as training_id,
  nt.name,
  nt.phone,
  nt.status as training_status,
  nc.cohort_number,
  ncand.id as candidate_id,
  ncand.name as candidate_name,
  ncand.status as candidate_status,
  nt.training_type,
  nt.created_at
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
ORDER BY nc.cohort_number NULLS LAST, nt.name;

-- Count by cohort
SELECT 
  'EXPELLED BY COHORT' as info,
  nc.cohort_number,
  COUNT(*) as expelled_count
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.status = 'Expelled'
GROUP BY nc.cohort_number
ORDER BY nc.cohort_number;

-- Check if they're all blacklisted in candidates
SELECT 
  'SYNC CHECK' as info,
  COUNT(*) as total_expelled_in_training,
  COUNT(CASE WHEN ncand.status = 'BLACKLISTED' THEN 1 END) as blacklisted_in_candidates,
  COUNT(CASE WHEN ncand.status != 'BLACKLISTED' OR ncand.status IS NULL THEN 1 END) as not_blacklisted
FROM niche_training nt
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled';
