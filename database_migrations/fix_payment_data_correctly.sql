-- Fix payment data - only Loice Were should be marked as Paid
-- Reset all others to Pending with 0 total_paid

-- 1. Show current incorrect data
SELECT 
    'CURRENT INCORRECT DATA' as type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as marked_paid,
    COUNT(CASE WHEN total_paid > 0 THEN 1 END) as showing_payments,
    SUM(total_paid) as total_showing_paid
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id;

-- 2. Show Dianah's duplicate records
SELECT 
    'DIANAH DUPLICATES' as type,
    nf.id as fee_id,
    nf.training_id,
    nf.total_paid,
    nf.payment_status,
    nt.status as training_status,
    nf.created_at
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.name = 'Dianah Faith Washiali'
ORDER BY nf.created_at;

-- 3. Reset all payments to 0 and status to Pending (except Loice Were)
UPDATE niche_fees 
SET total_paid = 0,
    payment_status = 'Pending',
    updated_at = NOW()
WHERE id IN (
    SELECT nf.id 
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
    WHERE nt.name != 'Loice Were'
);

-- 4. Delete Dianah's duplicate records (keep only the first one)
DELETE FROM niche_fees 
WHERE id IN (
    SELECT fee_id FROM (
        SELECT 
            nf.id as fee_id,
            ROW_NUMBER() OVER (
                PARTITION BY nt.name, nt.phone 
                ORDER BY nf.created_at
            ) as row_num
        FROM niche_fees nf
        JOIN niche_training nt ON nf.training_id = nt.id
        WHERE nt.name = 'Dianah Faith Washiali'
    ) ranked_fees
    WHERE row_num > 1
);

-- 5. Delete any other duplicates
DELETE FROM niche_fees 
WHERE id IN (
    SELECT fee_id FROM (
        SELECT 
            nf.id as fee_id,
            ROW_NUMBER() OVER (
                PARTITION BY nt.name, nt.phone 
                ORDER BY nf.created_at
            ) as row_num
        FROM niche_fees nf
        JOIN niche_training nt ON nf.training_id = nt.id
    ) ranked_fees
    WHERE row_num > 1
);

-- 6. Verify the fix - should show only Loice Were as Paid
SELECT 
    'AFTER FIX - PAID RECORDS' as type,
    nt.name,
    nt.phone,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status,
    (nf.course_fee - nf.total_paid) as balance_due
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nf.payment_status = 'Paid'
ORDER BY nt.name;

-- 7. Summary after fix
SELECT 
    'SUMMARY AFTER FIX' as type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as paid_records,
    COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_records,
    SUM(total_paid) as total_actual_payments,
    COUNT(DISTINCT nt.name) as unique_names
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id;