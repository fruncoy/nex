-- Fix NICHE Fees Issues

-- 1. Remove duplicate fees (keep the first one for each training_id)
DELETE FROM niche_fees 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM niche_fees 
    GROUP BY training_id
);

-- 2. Update wrong amounts back to 20000 (for 2-Week Flagship trainees)
UPDATE niche_fees 
SET total_paid = 20000
WHERE training_id IN (
    SELECT nt.id 
    FROM niche_training nt
    LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
    WHERE nc.category = '2-Week Flagship' OR nc.category IS NULL
)
AND total_paid != 20000;

-- 3. Update short course fees to 5000
UPDATE niche_fees 
SET total_paid = 5000
WHERE training_id IN (
    SELECT nt.id 
    FROM niche_training nt
    LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
    WHERE nc.category = 'Short Course'
)
AND total_paid != 5000;

-- 4. Add missing fee records for Active and Graduated trainees
INSERT INTO niche_fees (training_id, total_paid)
SELECT 
    nt.id,
    CASE 
        WHEN nc.category = 'Short Course' THEN 5000
        ELSE 20000 
    END as total_paid
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
AND nf.training_id IS NULL;

-- 5. Check results after fixes
SELECT 'After Fix - Duplicates Check' as check_type, COUNT(*) as count
FROM (
    SELECT training_id
    FROM niche_fees 
    GROUP BY training_id 
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 'After Fix - Wrong Amounts (2-Week Flagship)' as check_type, COUNT(*) as count
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
WHERE (nc.category = '2-Week Flagship' OR nc.category IS NULL) AND nf.total_paid != 20000

UNION ALL

SELECT 'After Fix - Wrong Amounts (Short Course)' as check_type, COUNT(*) as count
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
WHERE nc.category = 'Short Course' AND nf.total_paid != 5000

UNION ALL

SELECT 'After Fix - Missing Fees' as check_type, COUNT(*) as count
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
AND nf.training_id IS NULL;

-- 6. Final summary
SELECT 
    COALESCE(nc.category, '2-Week Flagship') as category,
    nt.status,
    COUNT(nt.id) as total_trainees,
    COUNT(nf.training_id) as trainees_with_fees,
    AVG(nf.total_paid) as avg_fee_amount
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nt.candidate_id = nc.id
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY COALESCE(nc.category, '2-Week Flagship'), nt.status
ORDER BY category, nt.status;