-- Fix the status discrepancies
-- Change the 4 people who are "ONLY IN CANDIDATES" from "Graduated" to "Qualified"

UPDATE niche_candidates 
SET status = 'Qualified'
WHERE name IN (
    'Harriet Jesang',
    'Jacqueline Kemunto Ogembo',
    'Mariagisela Wesera Nyage',
    'Mary Wambui Ndichu'
) AND status = 'Graduated';

-- Verify the changes
SELECT 
    'AFTER_UPDATE' as type,
    name,
    status
FROM niche_candidates 
WHERE name IN (
    'Harriet Jesang',
    'Jacqueline Kemunto Ogembo',
    'Mariagisela Wesera Nyage',
    'Mary Wambui Ndichu'
);

-- Check new counts after fix
SELECT 'CANDIDATES_GRADUATED_AFTER_FIX' as source, COUNT(*) as count 
FROM niche_candidates WHERE status = 'Graduated'
UNION ALL
SELECT 'TRAINING_GRADUATED' as source, COUNT(*) as count 
FROM niche_training WHERE status = 'Graduated';