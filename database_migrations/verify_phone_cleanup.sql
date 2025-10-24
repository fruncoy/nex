-- Verify phone number cleanup results

-- Check if any duplicates remain
SELECT 
    phone,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
FROM candidates 
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Show sample of normalized phone numbers
SELECT 
    name,
    phone,
    created_at
FROM candidates 
WHERE phone IS NOT NULL AND phone != ''
ORDER BY phone
LIMIT 20;

-- Count total candidates with phones
SELECT COUNT(*) as total_candidates_with_phones
FROM candidates 
WHERE phone IS NOT NULL AND phone != '';