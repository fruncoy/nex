-- Add course_type column first
ALTER TABLE niche_courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'specialized' CHECK (course_type IN ('flagship', 'specialized'));

-- Update courses with new structure
UPDATE niche_courses SET 
  course_type = 'flagship',
  cost_kes = 20000,
  duration_weeks = 2,
  description = 'Designed for individuals and house managers responsible for running homes with order, discretion, and accountability. This program builds systems thinking, communication skills, and professional authority. It prepares house managers to manage people, routines, and standards confidently.'
WHERE name = 'Professional House Manager Training Program';

UPDATE niche_courses SET 
  course_type = 'flagship',
  cost_kes = 20000,
  duration_weeks = 2,
  description = 'A structured program that prepares nannies and child caregivers to work calmly, safely, and professionally in modern homes. The focus is behavior, judgment, and consistency, not just childcare tasks. Graduates are ready for real households, not ideal scenarios.'
WHERE name = 'Professional Nanny Training Program';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 4500,
  duration_weeks = 0.2,
  description = 'A structured program that prepares caregivers to work calmly, safely, and professionally in modern homes. The focus is behavior, judgment, and consistency, not just childcare tasks. Graduates are ready for real households, not ideal scenarios.'
WHERE name = 'First Aid & Emergency Response';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 2750,
  duration_weeks = 0,
  description = 'Guides caregivers and parents through safe, age-appropriate feeding for infants and toddlers. Covers food preparation, hygiene, and responding to common feeding challenges. Designed to build confidence and reduce anxiety around early nutrition.'
WHERE name = 'First Foods Done Right: Weaning and Baby Nutrition';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 3000,
  duration_weeks = 0,
  description = 'Hands-on training in cleaning standards, laundry care, and home organization. Learners are taught systems, sequencing, and attention to detail. Designed to reduce mistakes, damage, and supervision needs.'
WHERE name = 'Laundry & Housekeeping Essentials';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 4000,
  duration_weeks = 0,
  description = 'Specialist training for caregivers supporting children with additional physical, developmental, or behavioural needs. Focuses on safety, consistency, communication, and working closely with parents. Ideal for households seeking informed, confident, and respectful care.'
WHERE name = 'Specialised Childcare Support Series';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 4000,
  duration_weeks = 0,
  description = 'Equips caregivers with simple, practical ways to support early speech and language development. Focuses on daily interactions, play, and routine-based support. Not therapy, but informed, supportive care at home.'
WHERE name = 'Helping Little Voices Grow: Speech Support at Home';

UPDATE niche_courses SET 
  course_type = 'specialized',
  cost_kes = 4000,
  duration_weeks = 0,
  description = 'Foundation Class: Builds confidence in hygiene, timing, and everyday family meals. Intermediate Class: Develops planning, nutrition balance, and consistency across menus with an international feel.'
WHERE name = 'Kitchen Confidence: Foundation & Intermediate Training';