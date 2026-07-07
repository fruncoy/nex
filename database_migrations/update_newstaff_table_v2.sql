-- Update staff table - remove is_graduate column
-- The is_graduate status is implied by having a niche_training_id

-- First, just drop the column - we don't need it anymore
ALTER TABLE newstaff_members DROP COLUMN IF EXISTS is_graduate;
