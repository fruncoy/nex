-- Count actual students per cohort
SELECT 
    nc.cohort_number,
    nc.status as cohort_status,
    COUNT(nt.id) as actual_student_count,
    STRING_AGG(nt.name, ', ') as student_names
FROM niche_cohorts nc
LEFT JOIN niche_training nt ON nc.id = nt.cohort_id
GROUP BY nc.cohort_number, nc.status
ORDER BY nc.cohort_number;