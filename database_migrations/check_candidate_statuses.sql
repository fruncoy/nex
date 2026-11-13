-- Check candidate statuses and counts
SELECT 
    status,
    COUNT(*) as count
FROM candidates 
GROUP BY status 
ORDER BY count DESC;

-- Check total candidates
SELECT COUNT(*) as total_candidates FROM candidates;

-- Check for any graduated variations
SELECT 
    status,
    COUNT(*) as count
FROM candidates 
WHERE status ILIKE '%graduat%' 
   OR status ILIKE '%placed%'
   OR status ILIKE '%hired%'
   OR status ILIKE '%employed%'
GROUP BY status;

-- Show sample of all statuses
SELECT DISTINCT status FROM candidates ORDER BY status;