-- Check current niche_training data to understand the structure
SELECT 
    name,
    course,
    training_type,
    training_category,
    status
FROM niche_training 
WHERE status = 'Active'
ORDER BY name;

-- Check what courses exist
SELECT DISTINCT course FROM niche_training WHERE course IS NOT NULL;

-- Check what training_type values exist  
SELECT DISTINCT training_type FROM niche_training WHERE training_type IS NOT NULL;

-- Check current categories
SELECT 
    category,
    COUNT(*) as count
FROM niche_candidates 
GROUP BY category;