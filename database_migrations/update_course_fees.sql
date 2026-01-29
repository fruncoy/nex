-- Update niche_courses with correct current fees
UPDATE niche_courses SET cost_kes = 20000 WHERE name = 'Professional House Manager Training Program';
UPDATE niche_courses SET cost_kes = 20000 WHERE name = 'Professional Nanny Training Program';
UPDATE niche_courses SET cost_kes = 4500 WHERE name = 'First Aid & Emergency Response';
UPDATE niche_courses SET cost_kes = 5500 WHERE name = 'First Foods Done Right: Weaning and Baby Nutrition';
UPDATE niche_courses SET cost_kes = 6000 WHERE name = 'Laundry & Housekeeping Essentials';
UPDATE niche_courses SET cost_kes = 8000 WHERE name = 'Specialised Childcare Support Series';
UPDATE niche_courses SET cost_kes = 8000 WHERE name = 'Helping Little Voices Grow: Speech Support at Home';
UPDATE niche_courses SET cost_kes = 4000 WHERE name = 'Kitchen Confidence: Foundation & Intermediate Training';

-- Update existing fee records with correct course fees
UPDATE niche_fees 
SET course_fee = COALESCE(nc.cost_kes, 0)
FROM niche_training nt
LEFT JOIN niche_courses nc ON nt.course = nc.name
WHERE niche_fees.training_id = nt.id;