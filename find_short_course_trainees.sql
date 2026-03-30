-- Find the specific short course trainees you mentioned by name and phone
-- First, let's see what's in the training table for these people

SELECT 
    nt.name,
    nt.phone,
    nt.course,
    nt.training_type,
    nt.status,
    nc.id as candidate_id,
    nc.category
FROM niche_training nt
LEFT JOIN niche_candidates nc ON (
    nt.candidate_id = nc.id OR 
    nt.phone = nc.phone OR 
    nt.name = nc.name
)
WHERE 
    nt.name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau')
    OR nt.phone IN ('+254 797 824720', '+254 728 435076', '0713240359', '0713803594', '0713240369', '0112267396')
ORDER BY nt.name;

-- Update these specific candidates to Short Course
UPDATE niche_candidates 
SET category = 'Short Course'
WHERE 
    name IN ('Violet Midecha Kimiya', 'Caroline Atieno', 'Mercy Kyule', 'Elizabeth Kioko', 'Brenda Mukite', 'Sarafina Kamau')
    OR phone IN ('+254 797 824720', '+254 728 435076', '0713240359', '0713803594', '0713240369', '0112267396')
    OR phone IN ('254797824720', '254728435076', '713240359', '713803594', '713240369', '112267396');

-- Check results
SELECT 
    category,
    COUNT(*) as count
FROM niche_candidates 
GROUP BY category;

-- Show the updated short course candidates
SELECT name, phone, category, status 
FROM niche_candidates 
WHERE category = 'Short Course';