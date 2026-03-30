-- Add category field to niche_candidates table to distinguish training types
ALTER TABLE niche_candidates 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'Short Course' 
CHECK (category IN ('Short Course', '2-Week Flagship'));

-- Add training_category field to niche_training table
ALTER TABLE niche_training 
ADD COLUMN IF NOT EXISTS training_category VARCHAR(20) DEFAULT 'Short Course'
CHECK (training_category IN ('Short Course', '2-Week Flagship'));

-- Update existing records based on their course type
UPDATE niche_training 
SET training_category = CASE 
    WHEN course LIKE '%Professional%' OR training_type = '2week' THEN '2-Week Flagship'
    ELSE 'Short Course'
END;

-- Update existing niche_candidates based on their status and any linked training
UPDATE niche_candidates 
SET category = CASE 
    WHEN status = 'Active in Training' THEN (
        SELECT CASE 
            WHEN nt.course LIKE '%Professional%' OR nt.training_type = '2week' THEN '2-Week Flagship'
            ELSE 'Short Course'
        END
        FROM niche_training nt 
        WHERE nt.candidate_id = niche_candidates.id 
        LIMIT 1
    )
    ELSE 'Short Course'  -- Default for new inquiries
END;

-- Add comments to explain the fields
COMMENT ON COLUMN niche_candidates.category IS 'Training category: Short Course or 2-Week Flagship';
COMMENT ON COLUMN niche_training.training_category IS 'Training category: Short Course or 2-Week Flagship';