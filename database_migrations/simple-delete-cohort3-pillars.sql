-- Check how Cohort II is identified in niche grading
SELECT 
    nc.cohort_number,
    nc.id as cohort_id,
    COUNT(tg.id) as grade_records
FROM niche_cohorts nc
LEFT JOIN trainee_grades tg ON nc.id = tg.cohort_id
WHERE nc.cohort_number = 2
GROUP BY nc.cohort_number, nc.id;

-- Check Cohort 3 pillar records before deletion
SELECT 
    nc.cohort_number,
    nc.id as cohort_id,
    COUNT(tg.id) as grade_records,
    COUNT(spg.grade_id) as subpillar_records
FROM niche_cohorts nc
LEFT JOIN trainee_grades tg ON nc.id = tg.cohort_id
LEFT JOIN niche_subpillar_grades spg ON tg.id = spg.grade_id
WHERE nc.cohort_number = 3
GROUP BY nc.cohort_number, nc.id;

-- SIMPLE DELETE ALL PILLAR RECORDS FOR COHORT 3
-- Delete sub-pillar grades first
DELETE FROM niche_subpillar_grades 
WHERE grade_id IN (
    SELECT tg.id 
    FROM trainee_grades tg
    JOIN niche_cohorts nc ON tg.cohort_id = nc.id
    WHERE nc.cohort_number = 3
);

-- Delete main pillar grades
DELETE FROM trainee_grades 
WHERE cohort_id IN (
    SELECT id FROM niche_cohorts WHERE cohort_number = 3
);

-- Verify deletion
SELECT 'Cohort 3 pillar records deleted' as status;
SELECT 
    nc.cohort_number,
    COUNT(tg.id) as remaining_grade_records
FROM niche_cohorts nc
LEFT JOIN trainee_grades tg ON nc.id = tg.cohort_id
WHERE nc.cohort_number = 3
GROUP BY nc.cohort_number;