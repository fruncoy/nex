-- Clean up payment records - keep only legitimate payments
-- Only Loice Were should have payment records

-- 1. Show which payment records will be deleted
SELECT 
    'PAYMENTS TO DELETE' as action,
    np.id as payment_id,
    np.amount,
    np.payment_method,
    nt.name as student_name,
    np.notes
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.name != 'Loice Were'
ORDER BY nt.name;

-- 2. Show Loice's payment records that will be kept
SELECT 
    'PAYMENTS TO KEEP' as action,
    np.id as payment_id,
    np.amount,
    np.payment_method,
    nt.name as student_name,
    np.notes
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.name = 'Loice Were'
ORDER BY np.payment_date;

-- 3. Delete all payment records except Loice Were's
DELETE FROM niche_payments 
WHERE fee_id IN (
    SELECT nf.id 
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
    WHERE nt.name != 'Loice Were'
);

-- 4. Verify cleanup - should show only Loice's payments
SELECT 
    'REMAINING PAYMENTS' as status,
    np.amount,
    np.payment_method,
    nt.name as student_name,
    nc.cohort_number
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
ORDER BY nt.name;

-- 5. Summary after cleanup
SELECT 
    'SUMMARY' as type,
    COUNT(*) as total_payment_records,
    SUM(np.amount) as total_amount,
    COUNT(DISTINCT nt.name) as students_with_payments
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id;