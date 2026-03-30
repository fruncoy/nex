-- Find exact people in niche_candidates as Graduated but NOT in niche_training
SELECT 
    'ONLY_IN_CANDIDATES' as type,
    nc.name,
    nc.phone,
    nc.status as candidate_status
FROM niche_candidates nc
LEFT JOIN niche_training nt ON nc.id = nt.candidate_id
WHERE nc.status = 'Graduated' 
  AND nt.id IS NULL
ORDER BY nc.name;

-- Count them
SELECT 
    'COUNT_ONLY_IN_CANDIDATES' as type,
    COUNT(*) as count
FROM niche_candidates nc
LEFT JOIN niche_training nt ON nc.id = nt.candidate_id
WHERE nc.status = 'Graduated' 
  AND nt.id IS NULL;

-- Double check the exact counts
SELECT 'CANDIDATES_GRADUATED' as source, COUNT(*) as count 
FROM niche_candidates WHERE status = 'Graduated'
UNION ALL
SELECT 'TRAINING_GRADUATED' as source, COUNT(*) as count 
FROM niche_training WHERE status = 'Graduated';