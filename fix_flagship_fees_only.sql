-- Fix only the 2-Week Flagship fees to 20000
-- Leave short course fees as they are until we know the correct amount

-- 1. Remove duplicate fees first
DELETE FROM niche_fees 
WHERE id NOT IN (
    SELECT DISTINCT ON (training_id) id
    FROM niche_fees 
    ORDER BY training_id, id
);

-- 2. Update 2-Week Flagship trainees to 20000 (exclude the known short course trainees)
UPDATE niche_fees 
SET total_paid = 20000
WHERE training_id NOT IN (
    SELECT nt.id 
    FROM niche_training nt
    WHERE nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau')
    OR nt.phone IN ('+254 797 824720', '+254 728 435076', '0713240359', '0713803594', '0713240369', '0112267396')
)
AND total_paid != 20000;

-- 3. Show current fees for short course trainees (so you can tell me what they should be)
SELECT 
    'Short Course Trainees - Current Fees:' as info;
    
SELECT 
    nt.name,
    nt.phone,
    nt.course,
    nf.total_paid as current_fee
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau')
OR nt.phone IN ('+254 797 824720', '+254 728 435076', '0713240359', '0713803594', '0713240369', '0112267396')
ORDER BY nt.name;

-- 4. Show summary after fixing 2-Week Flagship fees
SELECT 
    CASE 
        WHEN nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau') THEN 'Short Course'
        ELSE '2-Week Flagship'
    END as category,
    COUNT(*) as count,
    AVG(nf.total_paid) as avg_fee,
    MIN(nf.total_paid) as min_fee,
    MAX(nf.total_paid) as max_fee
FROM niche_training nt
JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nt.status IN ('Active', 'Graduated')
GROUP BY 
    CASE 
        WHEN nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau') THEN 'Short Course'
        ELSE '2-Week Flagship'
    END
ORDER BY category;