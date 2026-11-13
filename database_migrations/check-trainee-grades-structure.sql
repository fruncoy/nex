-- Check the structure of trainee_grades table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trainee_grades'
ORDER BY ordinal_position;

-- Show a sample record to understand the structure
SELECT * FROM trainee_grades LIMIT 1;