-- Check cohorts 20 and 21 with duplicate dates

SELECT 
  'Duplicate cohorts check' as info,
  id,
  cohort_number,
  start_date,
  end_date,
  status,
  training_type,
  created_at
FROM niche_cohorts
WHERE cohort_number IN (20, 21)
ORDER BY cohort_number;
