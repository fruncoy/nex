-- Simple comparison - Training graduates
SELECT 
    'TRAINING' as source,
    name,
    phone
FROM niche_training 
WHERE status = 'Graduated'
ORDER BY name;

-- Candidates graduates  
SELECT 
    'CANDIDATES' as source,
    name,
    phone
FROM niche_candidates 
WHERE status = 'Graduated'
ORDER BY name;