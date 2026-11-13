-- Check structure of trainee_grades table
SELECT 
  'trainee_grades' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'trainee_grades'
ORDER BY ordinal_position;

-- Check if niche_training has a reference to grades
SELECT 
  COUNT(*) as total_trainees,
  COUNT(CASE WHEN status = 'Graduated' THEN 1 END) as graduated_trainees
FROM niche_training;
