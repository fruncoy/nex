-- Check the actual structure of niche_fees table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'niche_fees'
ORDER BY ordinal_position;

-- Show sample data to understand the structure
SELECT * FROM niche_fees LIMIT 10;

-- Check if there's a different column that links to candidates
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'niche_fees' 
AND (column_name LIKE '%candidate%' OR column_name LIKE '%id%');

-- Check all tables that might be related to fees
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%fee%' OR table_name LIKE '%payment%'
ORDER BY table_name;