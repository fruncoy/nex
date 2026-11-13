-- Fix NICHE Fees Issues

-- 1. Remove duplicate fees (keep the first one for each candidate)
DELETE FROM niche_fees 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM niche_fees 
    GROUP BY candidate_id
);

-- 2. Update wrong amounts back to 20000 (for 2-Week Flagship candidates)
UPDATE niche_fees 
SET amount = 20000
WHERE candidate_id IN (
    SELECT nc.id 
    FROM niche_candidates nc 
    WHERE nc.category = '2-Week Flagship'
)
AND amount != 20000;

-- 3. Add missing fee records for Active in Training and Graduated candidates
INSERT INTO niche_fees (candidate_id, amount, status, created_at, updated_at)
SELECT 
    nc.id,
    CASE 
        WHEN nc.category = 'Short Course' THEN 5000
        ELSE 20000 
    END as amount,
    'pending',
    NOW(),
    NOW()
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.status IN ('Active in Training', 'Graduated')
AND nf.candidate_id IS NULL;

-- 4. Check results after fixes
SELECT 
    'Duplicates Check' as check_type,
    COUNT(*) as count
FROM (
    SELECT candidate_id
    FROM niche_fees 
    GROUP BY candidate_id 
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
    'Wrong Amounts (2-Week Flagship)' as check_type,
    COUNT(*) as count
FROM niche_fees nf
JOIN niche_candidates nc ON nf.candidate_id = nc.id
WHERE nc.category = '2-Week Flagship' AND nf.amount != 20000

UNION ALL

SELECT 
    'Missing Fees (Active/Graduated)' as check_type,
    COUNT(*) as count
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.status IN ('Active in Training', 'Graduated')
AND nf.candidate_id IS NULL

UNION ALL

SELECT 
    'Short Course Fees' as check_type,
    COUNT(*) as count
FROM niche_fees nf
JOIN niche_candidates nc ON nf.candidate_id = nc.id
WHERE nc.category = 'Short Course';

-- 5. Final summary
SELECT 
    nc.category,
    nc.status,
    COUNT(nc.id) as total_candidates,
    COUNT(nf.candidate_id) as candidates_with_fees,
    AVG(nf.amount) as avg_fee_amount
FROM niche_candidates nc
LEFT JOIN niche_fees nf ON nc.id = nf.candidate_id
WHERE nc.status IN ('Active in Training', 'Graduated')
GROUP BY nc.category, nc.status
ORDER BY nc.category, nc.status;