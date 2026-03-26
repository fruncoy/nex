-- Check which students these payments belong to
SELECT 
    np.id as payment_id,
    np.amount,
    np.payment_method,
    np.payment_date,
    np.notes,
    nt.name as student_name,
    nc.cohort_number,
    nf.total_paid as current_fee_total,
    nf.payment_status
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
ORDER BY nc.cohort_number, nt.name, np.payment_date;