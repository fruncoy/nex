-- Check if Dianah Faith Washiali exists in niche_candidates with different status
SELECT 
    'DIANAH_IN_CANDIDATES' as type,
    name,
    phone,
    status
FROM niche_candidates 
WHERE name ILIKE '%Dianah%' OR name ILIKE '%Faith%' OR name ILIKE '%Washiali%';

-- If she exists, update her status to Graduated
UPDATE niche_candidates 
SET status = 'Graduated'
WHERE name ILIKE '%Dianah Faith Washiali%' AND status != 'Graduated';

-- If she doesn't exist, we need to add her (get her details from training first)
SELECT 
    'DIANAH_IN_TRAINING' as type,
    name,
    phone,
    status,
    created_at
FROM niche_training 
WHERE name = 'Dianah Faith Washiali';

-- Check final counts - should be 21-21
SELECT 'CANDIDATES_GRADUATED_FINAL' as source, COUNT(*) as count 
FROM niche_candidates WHERE status = 'Graduated'
UNION ALL
SELECT 'TRAINING_GRADUATED_FINAL' as source, COUNT(*) as count 
FROM niche_training WHERE status = 'Graduated';