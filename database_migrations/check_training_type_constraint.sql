-- Check the constraint on training_type
SELECT 
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'niche_training_training_type_check'
  AND conrelid = 'niche_training'::regclass;

-- Check what training_type values currently exist
SELECT DISTINCT training_type
FROM niche_training
ORDER BY training_type;
