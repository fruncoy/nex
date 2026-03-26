-- Fix for NicheFees.tsx payment status issue
-- The problem is that total_paid field contains course fee amounts, not actual payments
-- Need to use actual payments from niche_payments table

-- First, let's see the current structure
SELECT 
    nf.id,
    nt.name,
    nf.total_paid as "fee_amount_in_total_paid_field",
    COALESCE(SUM(np.amount), 0) as "actual_payments_made",
    nf.total_paid - COALESCE(SUM(np.amount), 0) as "correct_balance"
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_payments np ON nf.id = np.fee_id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY nf.id, nt.name, nf.total_paid
ORDER BY nt.name;

-- The fix is in the frontend code - need to replace fee.total_paid with fee.actual_payments in display