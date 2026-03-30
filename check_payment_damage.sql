-- Check what total_paid actually represents and see the damage
SELECT * FROM niche_fees LIMIT 10;

-- Check if there are any payment records that might show actual payments
SELECT * FROM niche_payments LIMIT 10;

-- See the relationship between fees and payments
SELECT 
    nf.id as fee_id,
    nf.training_id,
    nf.total_paid as fee_amount,
    np.amount as payment_amount,
    np.payment_date,
    np.payment_method
FROM niche_fees nf
LEFT JOIN niche_payments np ON nf.id = np.fee_id
ORDER BY nf.training_id
LIMIT 20;

-- Check if we can see what the original amounts were
-- (This might not work if we already overwrote them)
SELECT 
    nt.name,
    nf.total_paid,
    COUNT(np.id) as payment_count,
    SUM(np.amount) as total_payments_made
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
GROUP BY nt.name, nf.total_paid
ORDER BY nt.name;