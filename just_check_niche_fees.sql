-- Check niche_fees table structure only
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'niche_fees'
ORDER BY ordinal_position;

-- Show sample data from niche_fees
SELECT * FROM niche_fees LIMIT 5;

-- Check for any columns that might link to candidates
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'niche_fees' 
AND (column_name LIKE '%candidate%' OR column_name LIKE '%trainee%' OR column_name LIKE '%student%' OR column_name LIKE '%id%');