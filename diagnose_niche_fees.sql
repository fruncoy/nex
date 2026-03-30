-- Check for duplicates in niche_fees
SELECT 
    candidate_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT amount::text, ', ') as amounts,
    STRING_AGG(DISTINCT id::text, ', ') as fee_ids
FROM niche_fees 
GROUP BY candidate_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check fees that are not 20000 (wrong amounts)
SELECT 
    nf.id,
    nf.candidate_id,
    nc.name,
    nc.category,
    nc.status,
    nf.amount,
    nf.created_at
FROM niche_fees nf
JOIN niche_candidates nc ON nf.candidate_id = nc.id
WHERE nf.amount != 20000
ORDER BY nf.amount;

-- Check candidates who should have fees but don't (Active in Training, Graduated)
SELECT 
    nc.id,
    nc.name,
    nc.category,
    nc.status,
    nf.amount
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.status IN ('Active in Training', 'Graduated')
AND nf.candidate_id IS NULL
ORDER BY nc.category, nc.name;

-- Check short course candidates and their fees
SELECT 
    nc.id,
    nc.name,
    nc.category,
    nc.status,
    nf.amount
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.category = 'Short Course'
ORDER BY nc.name;

-- Summary of all fees by category and status
SELECT 
    nc.category,
    nc.status,
    COUNT(nc.id) as total_candidates,
    COUNT(nf.candidate_id) as candidates_with_fees,
    COUNT(nc.id) - COUNT(nf.candidate_id) as missing_fees
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.status IN ('Active in Training', 'Graduated')
GROUP BY nc.category, nc.status
ORDER BY nc.category, nc.status;