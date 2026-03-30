-- List all graduated names from both tables for comparison
(SELECT 
    'NICHE_TRAINING' as source,
    name,
    phone
FROM niche_training 
WHERE status = 'Graduated'
ORDER BY name)

UNION ALL

(SELECT 
    'NICHE_CANDIDATES' as source,
    name,
    phone
FROM niche_candidates 
WHERE status = 'Graduated'
ORDER BY name);

-- Better view - show them side by side
WITH training_grads AS (
    SELECT name, phone FROM niche_training WHERE status = 'Graduated'
),
candidate_grads AS (
    SELECT name, phone FROM niche_candidates WHERE status = 'Graduated'
)
SELECT 
    COALESCE(t.name, c.name) as name,
    t.name as in_training,
    c.name as in_candidates,
    CASE 
        WHEN t.name IS NULL THEN 'ONLY IN CANDIDATES'
        WHEN c.name IS NULL THEN 'ONLY IN TRAINING'
        ELSE 'IN BOTH'
    END as status
FROM training_grads t
FULL OUTER JOIN candidate_grads c ON TRIM(LOWER(t.name)) = TRIM(LOWER(c.name))
ORDER BY name;