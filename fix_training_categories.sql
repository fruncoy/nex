-- Add category field to niche_candidates table to distinguish training types
ALTER TABLE niche_candidates 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT '2-Week Flagship' 
CHECK (category IN ('Short Course', '2-Week Flagship'));

-- Add training_category field to niche_training table
ALTER TABLE niche_training 
ADD COLUMN IF NOT EXISTS training_category VARCHAR(20) DEFAULT '2-Week Flagship'
CHECK (training_category IN ('Short Course', '2-Week Flagship'));

-- Update existing niche_training records based on their actual course type
UPDATE niche_training 
SET training_category = CASE 
    WHEN training_type = 'weekend' OR (course IS NOT NULL AND course NOT LIKE '%Professional%') THEN 'Short Course'
    ELSE '2-Week Flagship'
END;

-- Update existing niche_candidates - DEFAULT TO 2-Week Flagship
-- Only set to Short Course if they have a linked short course training record
UPDATE niche_candidates 
SET category = CASE 
    WHEN EXISTS (
        SELECT 1 FROM niche_training nt 
        WHERE nt.candidate_id = niche_candidates.id 
        AND (nt.training_type = 'weekend' OR nt.training_category = 'Short Course')
    ) THEN 'Short Course'
    ELSE '2-Week Flagship'  -- DEFAULT: All candidates are 2-Week Flagship unless proven otherwise
END;

-- Add comments to explain the fields
COMMENT ON COLUMN niche_candidates.category IS 'Training category: Short Course or 2-Week Flagship (default: 2-Week Flagship)';
COMMENT ON COLUMN niche_training.training_category IS 'Training category: Short Course or 2-Week Flagship';