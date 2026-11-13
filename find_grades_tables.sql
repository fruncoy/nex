-- Find tables related to grades
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%grade%' OR table_name LIKE '%trainee%')
ORDER BY table_name;
