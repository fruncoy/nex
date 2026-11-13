-- Fix NICHE Fees Issues (UUID corrected version)

-- 1. Remove duplicate fees (keep one for each training_id) - UUID version
DELETE FROM niche_fees 
WHERE id NOT IN (
    SELECT DISTINCT ON (training_id) id
    FROM niche_fees 
    ORDER BY training_id, id
);

-- 2. Update ALL wrong amounts to 20000 (since categories are null, assume 2-Week Flagship)
UPDATE niche_fees 
SET total_paid = 20000
WHERE total_paid < 20000;

-- 3. Check if any trainees are actually short course (from our earlier categorization)
-- Update short course fees to 5000 if we can identify them
UPDATE niche_fees 
SET total_paid = 5000
WHERE training_id IN (
    SELECT nt.id 
    FROM niche_training nt
    WHERE nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau')
    OR nt.phone IN ('+254 797 824720', '+254 728 435076', '0713240359', '0713803594', '0713240369', '0112267396')
);

-- 4. Check results after fixes
SELECT 'After Fix - Fee Distribution' as info;

SELECT 
    CASE 
        WHEN nf.total_paid = 5000 THEN 'Short Course (5000)'
        WHEN nf.total_paid = 20000 THEN '2-Week Flagship (20000)'
        ELSE 'Other Amount (' || nf.total_paid || ')'
    END as fee_category,
    COUNT(*) as count,
    AVG(nf.total_paid) as avg_amount
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY 
    CASE 
        WHEN nf.total_paid = 5000 THEN 'Short Course (5000)'
        WHEN nf.total_paid = 20000 THEN '2-Week Flagship (20000)'
        ELSE 'Other Amount (' || nf.total_paid || ')'
    END
ORDER BY avg_amount;

-- 5. Show trainees with their fees
SELECT 
    nt.name,
    nt.status,
    nf.total_paid,
    CASE 
        WHEN nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau') THEN 'Short Course'
        ELSE '2-Week Flagship'
    END as expected_category
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
ORDER BY nt.name;

-- 6. Final summary
SELECT 
    nt.status,
    COUNT(nt.id) as total_trainees,
    COUNT(nf.training_id) as trainees_with_fees,
    MIN(nf.total_paid) as min_fee,
    MAX(nf.total_paid) as max_fee,
    AVG(nf.total_paid) as avg_fee
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY nt.status
ORDER BY nt.status;