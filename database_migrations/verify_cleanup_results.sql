-- Verification script to check current state after cleanup

-- 1. Show the person with multiple legitimate enrollments
SELECT 
    'MULTIPLE ENROLLMENTS' as type,
    nt.name,
    nt.phone,
    COUNT(*) as enrollment_count,
    STRING_AGG(nf.id::text, ', ') as fee_ids,
    STRING_AGG(nf.course_fee::text, ', ') as course_fees,
    STRING_AGG(nf.payment_status, ', ') as payment_statuses,
    STRING_AGG(nt.status, ', ') as training_statuses
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
GROUP BY nt.name, nt.phone
HAVING COUNT(*) > 1
ORDER BY nt.name;

-- 2. Current summary statistics
SELECT 
    'CURRENT STATS' as type,
    COUNT(DISTINCT nf.id) as total_fee_records,
    COUNT(DISTINCT nf.training_id) as unique_training_ids,
    COUNT(DISTINCT nt.name) as unique_names,
    COUNT(DISTINCT nt.phone) as unique_phones,
    SUM(nf.course_fee) as total_course_fees,
    SUM(nf.total_paid) as total_payments
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id;

-- 3. Payment status breakdown
SELECT 
    'PAYMENT STATUS' as type,
    payment_status,
    COUNT(*) as count,
    SUM(course_fee) as total_fees,
    SUM(total_paid) as total_paid
FROM niche_fees
GROUP BY payment_status
ORDER BY payment_status;

-- 4. Check for any remaining data integrity issues
SELECT 
    'DATA INTEGRITY CHECK' as type,
    'Balance Due Mismatch' as issue,
    COUNT(*) as count
FROM niche_fees
WHERE balance_due != (course_fee - total_paid)

UNION ALL

SELECT 
    'DATA INTEGRITY CHECK' as type,
    'Paid Status but Not Fully Paid' as issue,
    COUNT(*) as count
FROM niche_fees
WHERE payment_status = 'Paid' AND total_paid < course_fee

UNION ALL

SELECT 
    'DATA INTEGRITY CHECK' as type,
    'Pending Status but Fully Paid' as issue,
    COUNT(*) as count
FROM niche_fees
WHERE payment_status != 'Paid' AND total_paid >= course_fee;

-- 5. Show all current records for final verification
SELECT 
    'ALL CURRENT RECORDS' as type,
    nt.name,
    nt.phone,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status,
    nf.balance_due,
    nt.status as training_status,
    nf.created_at
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
ORDER BY nt.name, nf.created_at;