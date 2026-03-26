-- Violet Midecha Kimiya Payment Correction
-- Current status: Shows 2,250 paid, but she actually paid 20,000
-- Need to restore her full payment and create proper refund record

-- 1. First, check Violet's current payment records
SELECT 
    'Current Violet Records' as status,
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    np.amount as payment_amount,
    np.payment_date,
    np.payment_method,
    np.notes
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE (nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%')
  AND nt.course LIKE '%First Aid%'
ORDER BY np.payment_date;

-- 2. Restore Violet's original payment amount
UPDATE niche_payments 
SET amount = 20000,
    notes = 'Original payment - overpayment of 15,500 to be refunded'
WHERE fee_id IN (
    SELECT nf.id 
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
    WHERE (nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%')
      AND nt.course LIKE '%First Aid%'
);

-- 3. Add refund record for the overpayment
INSERT INTO niche_payments (fee_id, amount, payment_date, payment_method, notes)
SELECT 
    nf.id,
    -15500,
    CURRENT_DATE,
    'Cash',
    'Refund for overpayment: Course fee 4,500, paid 20,000'
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE (nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%')
  AND nt.course LIKE '%First Aid%'
  AND NOT EXISTS (
    SELECT 1 FROM niche_payments np2 
    WHERE np2.fee_id = nf.id AND np2.amount = -15500
  );

-- 4. Verify the correction
SELECT 
    'After Correction' as status,
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
WHERE (nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%')
  AND nt.course LIKE '%First Aid%'
ORDER BY np.payment_date;

-- 5. Summary showing net payment
SELECT 
    'Final Summary' as status,
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    SUM(np.amount) as net_payments,
    (nf.total_paid - SUM(np.amount)) as balance,
    CASE 
        WHEN SUM(np.amount) >= nf.total_paid THEN 'Paid'
        WHEN SUM(np.amount) > 0 THEN 'Partial'
        ELSE 'Pending'
    END as payment_status
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE (nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%')
  AND nt.course LIKE '%First Aid%'
GROUP BY nt.id, nt.name, nt.phone, nt.course, nf.total_paid;