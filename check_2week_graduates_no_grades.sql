-- Check 2-week flagship graduates without grades (like Jentix)

-- Show all 2-week graduates and their grade status
SELECT 
  '2-Week Graduates - Grade Status' as info,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.training_type,
  nt.status,
  tg.id as grade_id,
  tg.final_score,
  tg.tier,
  CASE 
    WHEN tg.id IS NULL THEN 'NO GRADE RECORD - LIKE JENTIX'
    ELSE 'HAS GRADE'
  END as grade_status
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN trainee_grades tg ON nt.id = tg.trainee_id
WHERE nt.training_type = '2week'
  AND nt.status = 'Graduated'
ORDER BY nc.cohort_number, nt.name;

-- Count how many graduated without grades
SELECT 
  'Graduated without grades' as check_type,
  COUNT(*) as count
FROM niche_training nt
LEFT JOIN trainee_grades tg ON nt.id = tg.trainee_id
WHERE nt.training_type = '2week'
  AND nt.status = 'Graduated'
  AND tg.id IS NULL;

-- List of people who need grading
SELECT 
  'Need Grading' as action,
  nt.name,
  nc.cohort_number,
  nt.phone
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN trainee_grades tg ON nt.id = tg.trainee_id
WHERE nt.training_type = '2week'
  AND nt.status = 'Graduated'
  AND tg.id IS NULL
ORDER BY nc.cohort_number, nt.name;
