-- Remove duplicate interviews for the same candidate
-- Keep only the most recent interview for each candidate

WITH ranked_interviews AS (
  SELECT 
    id,
    candidate_id,
    ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY created_at DESC) as rn
  FROM interviews
)
DELETE FROM interviews 
WHERE id IN (
  SELECT id 
  FROM ranked_interviews 
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates for scheduled interviews
-- This will prevent multiple scheduled interviews for the same candidate
CREATE UNIQUE INDEX IF NOT EXISTS unique_scheduled_interview_per_candidate 
ON interviews (candidate_id) 
WHERE outcome IS NULL AND attended = false;