-- Check for duplicates in niche_fees (multiple fee records for same training_id)
SELECT 
    training_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT total_paid::text, ', ') as amounts,
    STRING_AGG(DISTINCT id::text, ', ') as fee_ids
FROM niche_fees 
GROUP BY training_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check fees that are not 20000 (wrong amounts)
SELECT 
    nf.id,
    nf.training_id,
    nt.name,
    nc.category,
    nc.status,
    nf.total_paid,
    nt.created_at
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
WHERE nf.total_paid != 20000
ORDER BY nf.total_paid;

-- Check trainees who should have fees but don't (Active, Graduated)
SELECT 
    nt.id as training_id,
    nt.name,
    nc.category,
    nt.status,
    nf.total_paid
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
AND nf.training_id IS NULL
ORDER BY nc.category, nt.name;

-- Check short course trainees and their fees
SELECT 
    nt.id as training_id,
    nt.name,
    nc.category,
    nt.status,
    nf.total_paid
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nc.category = 'Short Course'
ORDER BY nt.name;

-- Summary of fees by category and status
SELECT 
    nc.category,
    nt.status,
    COUNT(nt.id) as total_trainees,
    COUNT(nf.training_id) as trainees_with_fees,
    COUNT(nt.id) - COUNT(nf.training_id) as missing_fees,
    AVG(nf.total_paid) as avg_fee_amount
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY nc.category, nt.status
ORDER BY nc.category, nt.status;