-- Find the 21 candidates who are Graduated in niche_training table
SELECT 
    nt.id as training_id,
    nt.name as training_name,
    nt.phone as training_phone,
    nt.status as training_status,
    nt.created_at as training_created,
    nc.id as candidate_id,
    nc.name as candidate_name,
    nc.status as candidate_status,
    CASE 
        WHEN nc.id IS NULL THEN 'NOT IN CANDIDATES TABLE'
        WHEN nc.status != 'Graduated' THEN 'DIFFERENT STATUS IN CANDIDATES'
        ELSE 'MATCHED'
    END as match_status
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
WHERE nt.status = 'Graduated'
ORDER BY nt.name;

-- Summary of the 21 graduated in training
SELECT 
    'TRAINING_GRADUATED' as type,
    COUNT(*) as count
FROM niche_training 
WHERE status = 'Graduated';