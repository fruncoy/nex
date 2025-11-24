-- Check current work_schedule constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'candidates'::regclass 
AND conname LIKE '%work_schedule%';

-- Check existing work_schedule values
SELECT DISTINCT work_schedule, COUNT(*) 
FROM candidates 
WHERE work_schedule IS NOT NULL 
GROUP BY work_schedule;