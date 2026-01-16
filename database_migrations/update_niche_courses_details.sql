-- Update niche_courses table structure to include more details
ALTER TABLE niche_courses 
ADD COLUMN IF NOT EXISTS duration_text TEXT,
ADD COLUMN IF NOT EXISTS format TEXT,
ADD COLUMN IF NOT EXISTS cost_kes INTEGER,
ADD COLUMN IF NOT EXISTS full_description TEXT;

-- Update existing courses with detailed information
UPDATE niche_courses SET 
  duration_text = '2 Weeks',
  format = 'In-Person/Boarding',
  cost_kes = 20000,
  full_description = 'Designed for individuals and house managers responsible for running homes with order, discretion, and accountability. This program builds systems thinking, communication skills, and professional authority. It prepares house managers to manage people, routines, and standards confidently.',
  duration_weeks = 2
WHERE name = 'Professional House Manager Training Program';

UPDATE niche_courses SET 
  duration_text = '2 Weeks',
  format = 'In-Person/Boarding',
  cost_kes = 20000,
  full_description = 'A structured program that prepares nannies and child caregivers to work calmly, safely, and professionally in modern homes. The focus is behavior, judgment, and consistency, not just childcare tasks. Graduates are ready for real households, not ideal scenarios.',
  duration_weeks = 2
WHERE name = 'Professional Nanny Training Program';

UPDATE niche_courses SET 
  duration_text = '1 Day',
  format = 'In-Person',
  cost_kes = 4500,
  full_description = 'A structured program that prepares caregivers to work calmly, safely, and professionally in modern homes. The focus is behavior, judgment, and consistency, not just childcare tasks. Graduates are ready for real households, not ideal scenarios.',
  duration_weeks = 1
WHERE name = 'First Aid & Emergency Response';

UPDATE niche_courses SET 
  duration_text = '4 Sessions (Weekend)',
  format = 'In-Person',
  cost_kes = 9500,
  full_description = 'Guides caregivers and parents through safe, age-appropriate feeding for infants and toddlers. Covers food preparation, hygiene, and responding to common feeding challenges. Designed to build confidence and reduce anxiety around early nutrition.',
  duration_weeks = 4
WHERE name = 'First Foods Done Right: Weaning and Baby Nutrition';

UPDATE niche_courses SET 
  duration_text = '4 Sessions (Weekend)',
  format = 'In-Person',
  cost_kes = 12000,
  full_description = 'Hands-on training in cleaning standards, laundry care, and home organisation. Learners are taught systems, sequencing, and attention to detail. Designed to reduce mistakes, damage, and supervision needs.',
  duration_weeks = 4
WHERE name = 'Laundry & Housekeeping Essentials';

UPDATE niche_courses SET 
  duration_text = '4 Sessions (Weekend)',
  format = 'In-Person',
  cost_kes = 16000,
  full_description = 'Specialist training for caregivers supporting children with additional physical, developmental, or behavioural needs. Focuses on safety, consistency, communication, and working closely with parents. Ideal for households seeking informed, confident, and respectful care.',
  duration_weeks = 4
WHERE name = 'Specialised Childcare Support Series';

UPDATE niche_courses SET 
  duration_text = '4 Sessions (Weekend)',
  format = 'In-Person',
  cost_kes = 16000,
  full_description = 'Equips caregivers with simple, practical ways to support early speech and language development. Focuses on daily interactions, play, and routine-based support. Not therapy, but informed, supportive care at home.',
  duration_weeks = 4
WHERE name = 'Helping Little Voices Grow: Speech Support at Home';

UPDATE niche_courses SET 
  duration_text = '5 Sessions (Weekend)',
  format = 'In-Person',
  cost_kes = 20000,
  full_description = 'Foundation Class: Builds confidence in hygiene, timing, and everyday family meals. Intermediate Class: Develops planning, nutrition balance, and consistency across menus with an international feel.',
  duration_weeks = 5
WHERE name = 'Kitchen Confidence: Foundation & Intermediate Training';