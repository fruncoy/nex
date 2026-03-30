-- Populate niche_fees table with active students and correct course fees
INSERT INTO niche_fees (training_id, course_fee, payment_plan, total_paid)
SELECT 
  nt.id as training_id,
  COALESCE(nc.cost_kes, 0) as course_fee,
  'Full' as payment_plan,
  0 as total_paid
FROM niche_training nt
LEFT JOIN niche_courses nc ON nt.course = nc.name
WHERE nt.status = 'Active'
AND nt.id NOT IN (SELECT training_id FROM niche_fees WHERE training_id IS NOT NULL);

-- Update existing records with correct course fees
UPDATE niche_fees 
SET course_fee = COALESCE(nc.cost_kes, 0)
FROM niche_training nt
LEFT JOIN niche_courses nc ON nt.course = nc.name
WHERE niche_fees.training_id = nt.id
AND nt.status = 'Active';