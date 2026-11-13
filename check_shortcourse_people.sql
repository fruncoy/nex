-- Check all short course people

SELECT 
  'Short Course Trainees' as info,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.status,
  nt.phone
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.training_type = 'shortcourse'
ORDER BY nc.cohort_number NULLS LAST, nt.name;

-- Count by status
SELECT 
  'Short Course Status Distribution' as info,
  status,
  COUNT(*) as count
FROM niche_training
WHERE training_type = 'shortcourse'
GROUP BY status
ORDER BY count DESC;
