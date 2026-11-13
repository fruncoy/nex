-- Find candidates who are Graduated in niche_candidates but not in niche_training
-- This will show the 3 extra graduated candidates

SELECT 
    nc.id as candidate_id,
    nc.name as candidate_name,
    nc.phone,
    nc.status as candidate_status,
    nc.created_at as candidate_created,
    nt.id as training_id,
    nt.status as training_status,
    nt.created_at as training_created,
    CASE 
        WHEN nt.id IS NULL THEN 'NOT IN TRAINING TABLE'
        WHEN nt.status != 'Graduated' THEN 'DIFFERENT STATUS IN TRAINING'
        ELSE 'MATCHED'
    END as discrepancy_type
FROM niche_candidates nc
LEFT JOIN niche_training nt ON nc.id = nt.candidate_id
WHERE nc.status = 'Graduated'
ORDER BY discrepancy_type, nc.name;

-- Summary counts
SELECT 
    'SUMMARY' as type,
    COUNT(*) as total_graduated_in_candidates
FROM niche_candidates 
WHERE status = 'Graduated';

SELECT 
    'SUMMARY' as type,
    COUNT(*) as total_graduated_in_training
FROM niche_training 
WHERE status = 'Graduated';

-- Show the specific 3 extras
SELECT 
    'EXTRAS' as type,
    nc.name,
    nc.phone,
    nc.status as candidate_status,
    COALESCE(nt.status, 'NOT IN TRAINING') as training_status
FROM niche_candidates nc
LEFT JOIN niche_training nt ON nc.id = nt.candidate_id
WHERE nc.status = 'Graduated' 
  AND (nt.id IS NULL OR nt.status != 'Graduated');