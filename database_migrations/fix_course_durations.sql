-- Update course durations directly
UPDATE niche_courses SET duration_weeks = 0.2 WHERE name = 'First Aid & Emergency Response';
UPDATE niche_courses SET duration_weeks = 0.4 WHERE name IN (
  'First Foods Done Right: Weaning and Baby Nutrition',
  'Laundry & Housekeeping Essentials', 
  'Specialised Childcare Support Series',
  'Helping Little Voices Grow: Speech Support at Home',
  'Kitchen Confidence: Foundation & Intermediate Training'
);
UPDATE niche_courses SET cost_kes = 15000 WHERE name = 'Refresher Training';