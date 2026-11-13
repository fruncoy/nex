-- Check ALL expelled trainees and their candidate status
SELECT 
  'All expelled trainees' as check_type,
  nt.name,
  nt.phone as training_phone,
  nt.status as training_status,
  nt.cohort_id,
  nc.id as candidate_id,
  nc.name as candidate_name,
  nc.phone as candidate_phone,
  nc.status as candidate_status,
  CASE 
    WHEN nc.id IS NULL THEN 'NO MATCHING CANDIDATE'
    WHEN nc.status = 'BLACKLISTED' THEN 'CORRECT'
    ELSE 'WRONG STATUS'
  END as sync_status
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
ORDER BY nt.cohort_id, nt.name;

-- Count by cohort
SELECT 
  'Expelled by cohort' as check_type,
  nt.cohort_id,
  COUNT(*) as total_expelled,
  COUNT(nc.id) as has_matching_candidate,
  COUNT(CASE WHEN nc.status = 'BLACKLISTED' THEN 1 END) as correctly_blacklisted,
  COUNT(CASE WHEN nc.status != 'BLACKLISTED' AND nc.id IS NOT NULL THEN 1 END) as wrong_status,
  COUNT(CASE WHEN nc.id IS NULL THEN 1 END) as no_matching_candidate
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled'
GROUP BY nt.cohort_id
ORDER BY nt.cohort_id;

-- Summary
SELECT 
  'SUMMARY' as report,
  COUNT(*) as total_expelled_in_training,
  COUNT(CASE WHEN nc.status = 'BLACKLISTED' THEN 1 END) as correctly_blacklisted_in_candidates,
  COUNT(CASE WHEN nc.status != 'BLACKLISTED' AND nc.id IS NOT NULL THEN 1 END) as wrong_status_in_candidates,
  COUNT(CASE WHEN nc.id IS NULL THEN 1 END) as not_in_candidates_table
FROM niche_training nt
LEFT JOIN niche_candidates nc ON 
  REGEXP_REPLACE(nt.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(nc.phone, '[^0-9]', '', 'g')
WHERE nt.status = 'Expelled';
