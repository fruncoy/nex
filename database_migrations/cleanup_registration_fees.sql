-- Delete incorrect small payment records for 20,000 fee students
-- These were registration fees mistakenly entered as school fee payments

-- First, let's see what we're about to delete
SELECT 
    'PAYMENTS TO DELETE' as action,
    nt.name,
    nf.total_paid as course_fee,
    np.amount as payment_to_delete,
    np.payment_date,
    np.payment_method
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nf.total_paid = 20000  -- Only 20,000 fee students
  AND np.amount IN (500, 1500, 2000)  -- Small registration fee amounts
ORDER BY nt.name, np.amount;

-- Delete the incorrect payment records
DELETE FROM niche_payments 
WHERE fee_id IN (
    SELECT nf.id 
    FROM niche_fees nf 
    WHERE nf.total_paid = 20000
) 
AND amount IN (500, 1500, 2000);

-- Verify the cleanup - should show 0 payments for most 20,000 fee students
SELECT 
    'AFTER CLEANUP' as status,
    nt.name,
    nf.total_paid as course_fee,
    COALESCE(SUM(np.amount), 0) as remaining_payments,
    nf.total_paid - COALESCE(SUM(np.amount), 0) as new_balance
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nf.total_paid = 20000
GROUP BY nf.id, nt.name, nf.total_paid
ORDER BY nt.name;

-- Keep the legitimate payments (like Loice Were's 20,000 full payment)
-- Only delete the small registration fee amounts