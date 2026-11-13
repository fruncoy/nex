-- Check cohort data and alignment issues

-- Show all cohorts
SELECT 
  id,
  cohort_number,
  training_type,
  start_date,
  end_date,
  status,
  created_at
FROM niche_cohorts
ORDER BY cohort_number;

-- Check trainees per cohort
SELECT 
  nc.cohort_number,
  nc.training_type as cohort_training_type,
  COUNT(nt.id) as trainee_count,
  COUNT(CASE WHEN nt.training_type = 'shortcourse' OR nt.training_type = 'weekend' THEN 1 END) as short_course_count,
  COUNT(CASE WHEN nt.training_type = '2week' OR nt.training_type IS NULL THEN 1 END) as flagship_count
FROM niche_cohorts nc
LEFT JOIN niche_training nt ON nc.id = nt.cohort_id
GROUP BY nc.cohort_number, nc.training_type
ORDER BY nc.cohort_number;

-- Find trainees without cohort
SELECT 
  'Trainees without cohort' as issue,
  id,
  name,
  training_type,
  status
FROM niche_training
WHERE cohort_id IS NULL;

-- Find duplicate cohort dates
SELECT 
  'Duplicate cohort dates' as issue,
  start_date,
  end_date,
  COUNT(*) as count,
  array_agg(cohort_number) as cohorts
FROM niche_cohorts
GROUP BY start_date, end_date
HAVING COUNT(*) > 1
ORDER BY start_date;

-- Check short course trainees and their cohorts
SELECT 
  'Short course trainees with cohorts' as info,
  nt.name,
  nt.training_type,
  nc.cohort_number,
  nc.training_type as cohort_type
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.training_type = 'shortcourse'
ORDER BY nc.cohort_number NULLS LAST;
