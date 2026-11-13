-- Check payment transactions for Cohort 3
-- Find where the Cash and M-Pesa transaction records are stored

-- 1. Check niche_payments table for Cohort 3 students
SELECT 
    'COHORT 3 PAYMENTS' as type,
    np.id as payment_id,
    np.amount,
    np.payment_method,
    np.payment_date,
    nt.name as student_name,
    nc.cohort_number
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nc.cohort_number = 3
ORDER BY np.payment_date;

-- 2. Check all payment methods and amounts across all cohorts
SELECT 
    'ALL PAYMENT METHODS' as type,
    nc.cohort_number,
    np.payment_method,
    COUNT(*) as transaction_count,
    SUM(np.amount) as total_amount
FROM niche_payments np
JOIN niche_fees nf ON np.fee_id = nf.id
JOIN niche_training nt ON nf.training_id = nt.id
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
GROUP BY nc.cohort_number, np.payment_method
ORDER BY nc.cohort_number, np.payment_method;

-- 3. Check if there are any other payment-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%payment%' OR table_name LIKE '%transaction%')
ORDER BY table_name;