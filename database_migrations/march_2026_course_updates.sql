-- SQL to update NICHE courses and fees for March 2026 with Duration in HOURS
-- Run this in the Supabase SQL Editor

-- 1. Ensure duration_weeks is numeric (it will store hours for specialized courses)
-- ALTER TABLE niche_courses ALTER COLUMN duration_weeks TYPE NUMERIC;

-- 2. Update/Insert Specialized Courses with new fees and DURATION IN HOURS
INSERT INTO niche_courses (name, cost_kes, course_type, is_active, duration_weeks)
VALUES 
  ('Marinating & Grilling Class', 2500, 'specialized', true, 4),
  ('Home Baking & Pastry Foundations Class', 2500, 'specialized', true, 4),
  ('Creamy Alfredo, Lemon Butter Fish & Asian Stir Fry Class', 2500, 'specialized', true, 4),
  ('Housekeeping & Bedmaking', 2000, 'specialized', true, 4),
  ('Etiquette & Communication', 1500, 'specialized', true, 2),
  ('Pet Care', 1500, 'specialized', true, 2.5),
  ('Infant & Toddler Care', 2500, 'specialized', true, 9),
  ('Work Planning & Home Management', 1500, 'specialized', true, 2),
  ('Intro to basic first aid', 1500, 'specialized', true, 2),
  ('Housekeeping & Laundry', 2000, 'specialized', true, 5),
  ('Special Needs', 2000, 'specialized', true, 3),
  ('Weaning', 2000, 'specialized', true, 2),
  ('Inventory management & forecasting', 1500, 'specialized', true, 2)
ON CONFLICT (name) DO UPDATE SET 
  cost_kes = EXCLUDED.cost_kes,
  is_active = true,
  duration_weeks = EXCLUDED.duration_weeks,
  course_type = 'specialized';
