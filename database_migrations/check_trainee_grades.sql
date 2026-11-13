-- Check trainee_grades table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trainee_grades'
ORDER BY ordinal_position;
