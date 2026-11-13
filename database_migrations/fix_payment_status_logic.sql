-- Fix payment status logic errors
-- Find records where total_paid = course_fee but status is still Pending

-- 1. Show the problematic records
SELECT 
    'PAYMENT STATUS ERRORS' as issue_type,
    nf.id as fee_id,
    nf.training_id,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status,
    nf.balance_due,
    nt.name,
    nt.phone
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nf.total_paid = nf.course_fee 
  AND nf.payment_status != 'Paid'
  AND nf.balance_due = 0
ORDER BY nt.name;

-- 2. Show all payment statuses that need fixing
SELECT 
    'STATUS BREAKDOWN' as type,
    payment_status,
    COUNT(*) as count,
    SUM(CASE WHEN total_paid = course_fee AND balance_due = 0 THEN 1 ELSE 0 END) as should_be_paid
FROM niche_fees
GROUP BY payment_status
ORDER BY payment_status;

-- 3. Fix the payment statuses
UPDATE niche_fees 
SET payment_status = 'Paid',
    updated_at = NOW()
WHERE total_paid = course_fee 
  AND payment_status != 'Paid'
  AND balance_due = 0;

-- 4. Verify the fix
SELECT 
    'AFTER FIX' as status,
    payment_status,
    COUNT(*) as count
FROM niche_fees
GROUP BY payment_status
ORDER BY payment_status;

-- 5. Show any remaining issues
SELECT 
    'REMAINING ISSUES' as type,
    nf.id as fee_id,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status,
    nf.balance_due,
    nt.name
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE (nf.total_paid = nf.course_fee AND nf.payment_status != 'Paid')
   OR (nf.total_paid < nf.course_fee AND nf.payment_status = 'Paid')
   OR (nf.balance_due != (nf.course_fee - nf.total_paid))
ORDER BY nt.name;