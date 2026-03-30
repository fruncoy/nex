-- Handle Violet Midecha Kimiya Overpayment
-- She paid KSh 20,000 for a KSh 4,500 course = KSh 15,500 overpayment

-- Option 1: Create refund record (recommended)
-- Add a refund payment record with negative amount
INSERT INTO niche_payments (fee_id, amount, payment_date, payment_method, notes)
SELECT 
    nf.id,
    -15500,
    CURRENT_DATE,
    'Refund - Overpayment',
    'Refund for overpayment: Paid KSh 20,000 for KSh 4,500 course'
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.name LIKE '%Violet%' AND nt.phone LIKE '%797824720%'
  AND nt.course LIKE '%First Aid%';

-- Option 2: Adjust original payment (alternative)
-- UPDATE niche_payments 
-- SET amount = 4500,
--     notes = 'Adjusted from KSh 20,000 - KSh 15,500 refunded'
-- WHERE fee_id IN (
--     SELECT nf.id 
--     FROM niche_fees nf
--     JOIN niche_training nt ON nf.training_id = nt.id
--     WHERE nt.name LIKE '%Violet%' AND nt.phone LIKE '%797824720%'
--       AND nt.course LIKE '%First Aid%'
-- ) AND amount = 20000;

-- Verify the fix
SELECT 
    'Violet Overpayment Fix Verification' as check_type,
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    np.amount as payment_amount,
    np.payment_method,
    np.notes,
    np.payment_date
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.name LIKE '%Violet%' AND nt.phone LIKE '%797824720%'
ORDER BY np.payment_date;

-- Summary after fix
SELECT 
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    SUM(np.amount) as total_payments,
    (nf.total_paid - SUM(np.amount)) as balance,
    CASE 
        WHEN SUM(np.amount) >= nf.total_paid THEN 'Paid'
        WHEN SUM(np.amount) > 0 THEN 'Partial'
        ELSE 'Pending'
    END as status
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.name LIKE '%Violet%' AND nt.phone LIKE '%797824720%'
GROUP BY nt.id, nt.name, nt.phone, nt.course, nf.total_paid;