-- Remove recommendation column from niche_progress_assessments table
ALTER TABLE niche_progress_assessments 
DROP COLUMN IF EXISTS recommendation;