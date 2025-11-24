-- Check what candidate statuses currently exist in the database
SELECT DISTINCT status, COUNT(*) as count 
FROM candidates 
GROUP BY status 
ORDER BY status;

-- Check interview outcomes too
SELECT DISTINCT outcome, COUNT(*) as count 
FROM interviews 
WHERE outcome IS NOT NULL
GROUP BY outcome 
ORDER BY outcome;