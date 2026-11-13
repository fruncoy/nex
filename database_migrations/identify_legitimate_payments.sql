-- Check which students these payment records belong to
SELECT 
    np.id as payment_id,
    np.fee_id,
    np.amount,
    np.payment_method,
    np.notes,
    nt.name as student_name,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
ORDER BY nt.name, np.payment_date;

-- Also check which students should have legitimate payments
SELECT 
    'STUDENTS WHO SHOULD HAVE PAYMENTS' as type,
    nt.name,
    nf.total_paid,
    nf.payment_status,
    nf.course_fee
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nf.total_paid > 0 OR nf.payment_status = 'Paid'
ORDER BY nt.name;