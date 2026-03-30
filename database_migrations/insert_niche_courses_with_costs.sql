-- Insert/Update NICHE courses with correct costs and durations
INSERT INTO niche_courses (name, description, duration_weeks, cost_kes, is_active) VALUES
('Professional House Manager Training Program', 'Designed for individuals and house managers responsible for running homes with order, discretion, and accountability.', 2, 20000, true),
('Professional Nanny Training Program', 'A structured program that prepares nannies and child caregivers to work calmly, safely, and professionally in modern homes.', 2, 20000, true),
('First Aid & Emergency Response', 'A structured program that prepares caregivers to work calmly, safely, and professionally in modern homes.', 0.2, 4500, true),
('First Foods Done Right: Weaning and Baby Nutrition', 'Guides caregivers and parents through safe, age-appropriate feeding for infants and toddlers.', 0.4, 5500, true),
('Laundry & Housekeeping Essentials', 'Hands-on training in cleaning standards, laundry care, and home organisation.', 0.4, 6000, true),
('Specialised Childcare Support Series', 'Specialist training for caregivers supporting children with additional physical, developmental, or behavioural needs.', 0.4, 8000, true),
('Helping Little Voices Grow: Speech Support at Home', 'Equips caregivers with simple, practical ways to support early speech and language development.', 0.4, 8000, true),
('Kitchen Confidence: Foundation & Intermediate Training', 'Foundation Class: Builds confidence in hygiene, timing, and everyday family meals.', 0.4, 4000, true),
('Refresher Training', 'Refresher training for existing staff to update skills and knowledge.', 1, 15000, true)
ON CONFLICT (name) DO UPDATE SET
  cost_kes = EXCLUDED.cost_kes,
  description = EXCLUDED.description,
  duration_weeks = EXCLUDED.duration_weeks,
  is_active = EXCLUDED.is_active;

-- Update existing fee records that have 0 course_fee
UPDATE niche_fees 
SET course_fee = (
  SELECT cost_kes 
  FROM niche_courses 
  WHERE niche_courses.name = (
    SELECT course 
    FROM niche_training 
    WHERE niche_training.id = niche_fees.training_id
  )
)
WHERE course_fee = 0;