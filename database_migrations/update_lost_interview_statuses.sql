-- Update existing candidates with LOST status to specific interview-related lost statuses
-- This migration maps generic LOST status to specific reasons based on interview outcomes

-- First, update candidates who have interview records with specific outcomes
UPDATE candidates 
SET status = 'Lost - Interview Lost'
WHERE status = 'LOST' 
AND id IN (
    SELECT DISTINCT candidate_id 
    FROM interviews 
    WHERE outcome = 'Interview_Lost'
);

UPDATE candidates 
SET status = 'Lost - Missed Interview'
WHERE status = 'LOST' 
AND id IN (
    SELECT DISTINCT candidate_id 
    FROM interviews 
    WHERE outcome = 'Missed_Interview'
);

-- For any remaining LOST candidates without specific interview outcomes, 
-- default them to 'Lost - Interview Lost' (assuming they were interview-related losses)
UPDATE candidates 
SET status = 'Lost - Interview Lost'
WHERE status = 'LOST';

-- Verify the update
SELECT status, COUNT(*) as count 
FROM candidates 
WHERE status LIKE 'Lost%' 
GROUP BY status 
ORDER BY status;