-- Add grader_comments column to niche_progress_assessments table
ALTER TABLE niche_progress_assessments 
ADD COLUMN grader_comments TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN niche_progress_assessments.grader_comments IS 'Specific feedback from grader to help trainee understand their progress and areas for improvement';