-- Check niche_fees table structure and data
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'niche_fees'
ORDER BY ordinal_position;

-- Show sample data from niche_fees
SELECT * FROM niche_fees LIMIT 10;

-- Check the relationship between fees and candidates
SELECT 
    nf.*,
    nc.name,
    nc.category,
    nc.status
FROM niche_fees nf
LEFT JOIN niche_candidates nc ON nf.niche_candidate_id = nc.id
LIMIT 10;

-- If niche_candidate_id doesn't exist, try other possible column names
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'niche_fees' 
AND (column_name LIKE '%candidate%' OR column_name LIKE '%trainee%' OR column_name LIKE '%student%');