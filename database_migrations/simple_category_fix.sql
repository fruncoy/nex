-- Add category field to niche_candidates table only
ALTER TABLE niche_candidates 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT '2-Week Flagship' 
CHECK (category IN ('Short Course', '2-Week Flagship'));

-- Update candidates to Short Course if they have specific short course training
UPDATE niche_candidates 
SET category = 'Short Course'
WHERE id IN (
    SELECT DISTINCT nt.candidate_id 
    FROM niche_training nt 
    WHERE nt.candidate_id IS NOT NULL
    AND (
        nt.course LIKE '%First Aid%' OR
        nt.course LIKE '%Laundry%' OR  
        nt.course LIKE '%Housekeeping%' OR
        nt.course LIKE '%Kitchen Confidence%' OR
        nt.training_type = 'weekend' OR
        (nt.course IS NOT NULL AND nt.course NOT LIKE '%Professional%')
    )
);

-- Set all others to 2-Week Flagship (default)
UPDATE niche_candidates 
SET category = '2-Week Flagship'
WHERE category IS NULL OR category NOT IN ('Short Course', '2-Week Flagship');

-- Check results
SELECT 
    category,
    COUNT(*) as count
FROM niche_candidates 
GROUP BY category;