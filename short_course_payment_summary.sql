-- Short Course Payment Status Summary
-- Shows current payment status for all specialized skills training

SELECT 
    ROW_NUMBER() OVER (ORDER BY nt.course, nt.name) as "#",
    nt.name as "Student",
    nt.phone as "Phone",
    nt.course as "Course",
    CONCAT('KSh ', nf.total_paid::text) as "Course Fee",
    CONCAT('KSh ', COALESCE(SUM(np.amount), 0)::text) as "Total Paid",
    CONCAT('KSh ', (nf.total_paid - COALESCE(SUM(np.amount), 0))::text) as "Balance",
    CASE 
        WHEN COALESCE(SUM(np.amount), 0) = 0 THEN 'Pending'
        WHEN COALESCE(SUM(np.amount), 0) >= nf.total_paid THEN 'Paid'
        ELSE 'Partial'
    END as "Status"
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.course NOT LIKE '%Professional House Manager%'
   AND nt.course NOT LIKE '%Professional Nanny%'
GROUP BY nt.id, nt.name, nt.phone, nt.course, nf.total_paid
ORDER BY nt.course, nt.name;

-- Payment details for students with multiple payments
SELECT 
    'Payment Details' as section,
    nt.name,
    nt.course,
    np.amount,
    np.payment_date,
    np.payment_method,
    np.notes
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.course NOT LIKE '%Professional House Manager%'
   AND nt.course NOT LIKE '%Professional Nanny%'
ORDER BY nt.name, np.payment_date;