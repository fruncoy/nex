-- NICHE Fee Analysis and Fix Script
-- Based on the fee table data shown

-- 1. Check current fee structure issues
SELECT 
    nt.name,
    nt.phone,
    nt.course,
    nt.cohort_id,
    nf.total_paid as course_fee,
    COALESCE(SUM(np.amount), 0) as actual_payments,
    (nf.total_paid - COALESCE(SUM(np.amount), 0)) as balance,
    CASE 
        WHEN COALESCE(SUM(np.amount), 0) = 0 THEN 'Pending'
        WHEN COALESCE(SUM(np.amount), 0) >= nf.total_paid THEN 'Paid'
        ELSE 'Partial'
    END as payment_status
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
GROUP BY nt.id, nt.name, nt.phone, nt.course, nt.cohort_id, nf.total_paid
ORDER BY nt.course, nt.name;

-- 2. Fix Violet Midecha Kimiya overpayment issue
-- First, check her current records
SELECT 
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    np.amount as payment_amount,
    np.payment_date,
    np.payment_method
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.name LIKE '%Violet%' OR nt.phone LIKE '%797824720%';

-- 3. Standardize short course fees
-- Kitchen Confidence should be KSh 4,000
UPDATE niche_fees 
SET total_paid = 4000 
WHERE training_id IN (
    SELECT id FROM niche_training 
    WHERE course LIKE '%Kitchen Confidence%'
) AND total_paid != 4000;

-- First Aid should be KSh 4,500
UPDATE niche_fees 
SET total_paid = 4500 
WHERE training_id IN (
    SELECT id FROM niche_training 
    WHERE course LIKE '%First Aid%'
) AND total_paid != 4500;

-- Laundry & Housekeeping should be KSh 6,000
UPDATE niche_fees 
SET total_paid = 6000 
WHERE training_id IN (
    SELECT id FROM niche_training 
    WHERE course LIKE '%Laundry%'
) AND total_paid != 6000;

-- 4. Fix Violet's overpayment - adjust her payment to match course fee
UPDATE niche_payments 
SET amount = 4500
WHERE fee_id IN (
    SELECT nf.id 
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
    WHERE nt.name LIKE '%Violet%' AND nt.phone LIKE '%797824720%'
) AND amount = 20000;

-- 5. Verify fixes
SELECT 
    'After Fix - Fee Structure Check' as check_type,
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as course_fee,
    COALESCE(SUM(np.amount), 0) as total_payments,
    (nf.total_paid - COALESCE(SUM(np.amount), 0)) as balance
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.course NOT LIKE '%Professional House Manager%'
   AND nt.course NOT LIKE '%Professional Nanny%'
GROUP BY nt.id, nt.name, nt.phone, nt.course, nf.total_paid
ORDER BY nt.course, nt.name;