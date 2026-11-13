-- Check who has "Completed" status
SELECT 
  'COMPLETED STATUS' as info,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.training_type,
  nc.cohort_number
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.status = 'Completed'
ORDER BY nc.cohort_number, nt.name;

-- Check the 3 Active people
SELECT 
  'ACTIVE STATUS' as info,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.training_type,
  nc.cohort_number
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.status = 'Active'
ORDER BY nc.cohort_number, nt.name;

-- Check the 1 person without cohort
SELECT 
  'NO COHORT' as info,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.training_type,
  nt.created_at
FROM niche_training nt
WHERE nt.cohort_id IS NULL;
