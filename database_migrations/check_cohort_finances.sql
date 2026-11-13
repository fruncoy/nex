-- Check financial data per cohort
SELECT 
    nc.cohort_number,
    nc.status as cohort_status,
    COUNT(nt.id) as student_count,
    COUNT(nf.id) as fee_records,
    SUM(nf.course_fee) as total_expected_fees,
    SUM(nf.total_paid) as total_collected,
    SUM(nf.course_fee - nf.total_paid) as total_outstanding,
    COUNT(CASE WHEN nf.payment_status = 'Paid' THEN 1 END) as fully_paid_students,
    COUNT(CASE WHEN nf.payment_status = 'Pending' THEN 1 END) as pending_students
FROM niche_cohorts nc
LEFT JOIN niche_training nt ON nc.id = nt.cohort_id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nc.cohort_number <= 4  -- Only active cohorts with students
GROUP BY nc.cohort_number, nc.status
ORDER BY nc.cohort_number;