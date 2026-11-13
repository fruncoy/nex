-- FULL TRAINING AUDIT
-- Find all issues: wrong statuses, missing cohorts, grading issues

-- 1. Cohort 17 and below - NOT graduated (should be expelled except Jentix)
SELECT 
  'COHORT 17- SHOULD BE EXPELLED' as issue,
  nc.cohort_number,
  nt.id,
  nt.name,
  nt.phone,
  nt.status as current_status,
  nt.training_type,
  CASE 
    WHEN LOWER(nt.name) LIKE '%jentix%' THEN 'KEEP - Jentix exception'
    ELSE 'SHOULD BE EXPELLED'
  END as action
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number <= 17
  AND nt.status != 'Graduated'
ORDER BY nc.cohort_number, nt.name;

-- 2. People without cohort
SELECT 
  'NO COHORT' as issue,
  nt.id,
  nt.name,
  nt.phone,
  nt.status,
  nt.training_type,
  nt.created_at
FROM niche_training nt
WHERE nt.cohort_id IS NULL
ORDER BY nt.created_at DESC;

-- 3. Graduated but NOT graded (Jentix and others)
-- Check trainee_grades table
SELECT 
  'GRADUATED TRAINEES - GRADE CHECK' as issue,
  nt.id,
  nt.name,
  nt.phone,
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
WHERE nt.status = 'Graduated'
ORDER BY nc.cohort_number, nt.name;

-- 4. Short course status check
SELECT 
  'SHORT COURSE STATUS' as issue,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.status,
  nt.training_type,
  CASE 
    WHEN nt.training_type = 'shortcourse' AND nt.status NOT IN ('Active', 'Completed') THEN 'WRONG - Should be Active or Completed'
    WHEN nt.training_type != 'shortcourse' AND nt.status = 'Completed' THEN 'WRONG - Completed only for short course'
    ELSE 'OK'
  END as status_check
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.training_type = 'shortcourse'
ORDER BY nc.cohort_number, nt.name;

-- 5. 2-Week flagship status check
SELECT 
  '2-WEEK FLAGSHIP STATUS' as issue,
  nt.id,
  nt.name,
  nc.cohort_number,
  nt.status,
  nt.training_type,
  CASE 
    WHEN nt.training_type IN ('2week', 'weekend') AND nt.status = 'Completed' THEN 'WRONG - Completed only for short course'
    WHEN nt.training_type IN ('2week', 'weekend') AND nt.status NOT IN ('Active', 'Graduated', 'Expelled') THEN 'WRONG - Invalid status for 2-week'
    ELSE 'OK'
  END as status_check
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.training_type IN ('2week', 'weekend')
  OR nt.training_type IS NULL
ORDER BY nc.cohort_number, nt.name;

-- 6. Summary counts
SELECT 
  'SUMMARY' as report,
  (SELECT COUNT(*) FROM niche_training) as total_trainees,
  (SELECT COUNT(*) FROM niche_training WHERE cohort_id IS NULL) as no_cohort,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Graduated') as graduated,
  (SELECT COUNT(*) FROM niche_training nt LEFT JOIN trainee_grades tg ON nt.id = tg.trainee_id WHERE nt.status = 'Graduated' AND tg.id IS NULL) as graduated_not_graded,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Expelled') as expelled,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Active') as active,
  (SELECT COUNT(*) FROM niche_training WHERE training_type = 'shortcourse') as short_course,
  (SELECT COUNT(*) FROM niche_training WHERE training_type IN ('2week', 'weekend') OR training_type IS NULL) as two_week_flagship;
