-- Check if the linking between tables is working properly
-- Compare by name and phone since candidate_id might not be linking correctly

SELECT 
    'MATCHING_BY_NAME_PHONE' as type,
    nc.name as candidate_name,
    nc.phone as candidate_phone,
    nc.status as candidate_status,
    nt.name as training_name,
    nt.phone as training_phone,
    nt.status as training_status,
    nt.candidate_id,
    nc.id as candidate_id
FROM niche_candidates nc
INNER JOIN niche_training nt ON (
    TRIM(LOWER(nc.name)) = TRIM(LOWER(nt.name)) 
    OR REPLACE(REPLACE(nc.phone, ' ', ''), 'tel:', '') = REPLACE(REPLACE(nt.phone, ' ', ''), 'tel:', '')
)
WHERE nc.status = 'Graduated' AND nt.status = 'Graduated'
ORDER BY nc.name;

-- Check if candidate_id field is properly populated in niche_training
SELECT 
    'TRAINING_WITH_CANDIDATE_ID' as type,
    COUNT(*) as count
FROM niche_training 
WHERE candidate_id IS NOT NULL;

-- Check if candidate_id field is NULL in niche_training
SELECT 
    'TRAINING_WITHOUT_CANDIDATE_ID' as type,
    COUNT(*) as count
FROM niche_training 
WHERE candidate_id IS NULL;