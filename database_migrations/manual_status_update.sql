-- Manual SQL script to add new candidate statuses
-- Run this in your Supabase SQL editor
-- Note: We keep both "Lost, No Response" and "Lost, No References" as separate statuses

-- Check current status distribution
SELECT status, COUNT(*) as count 
FROM candidates 
GROUP BY status 
ORDER BY count DESC;