-- List all people from cohort 17 and below who are NOT graduated
-- These should be expelled (except Jentix)

SELECT 
  'Wrong status in old cohorts' as info,
  nc.cohort_number,
  nt.name,
  nt.status as current_training_status,
  ncand.status as current_candidate_status,
  CASE 
    WHEN LOWER(nt.name) LIKE '%jentix%' THEN 'KEEP AS IS - Jentix'
    ELSE 'SHOULD BE EXPELLED'
  END as recommendation,
  nt.phone
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN niche_candidates ncand ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(ncand.phone, '[^0-9]', '', 'g')
WHERE nc.cohort_number <= 17
  AND nt.status != 'Graduated'
ORDER BY nc.cohort_number, nt.name;
