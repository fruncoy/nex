-- EXECUTE NICHE SYNC SETUP
-- Copy and paste the contents of fix_niche_duplicates_and_sync_final.sql into your Supabase SQL editor
-- Then run these verification queries:

-- 1. Check if blacklist table was created
SELECT 
    'Blacklist table check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blacklist') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as table_status;

-- 2. Check if functions were created
SELECT 
    'Functions created successfully' as result,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'normalize_phone_niche',
    'sync_niche_training_to_candidates', 
    'prevent_niche_training_duplicates',
    'force_sync_niche_candidates'
)
ORDER BY routine_name;

-- 3. Check if triggers were created
SELECT 
    'Triggers created successfully' as result,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name IN (
    'sync_training_to_candidates_trigger',
    'prevent_training_duplicates_trigger'
)
ORDER BY trigger_name;

-- 4. Test phone normalization
SELECT 
    'Phone normalization test' as test,
    normalize_phone_niche('0712345678') as normalized_phone,
    normalize_phone_niche('+254712345678') as already_normalized,
    normalize_phone_niche('712345678') as missing_zero;

-- 5. Check current sync status
SELECT 
    'Current sync status' as info,
    (SELECT COUNT(*) FROM niche_candidates) as total_candidates,
    (SELECT COUNT(*) FROM niche_training) as total_training,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Active in Training') as active_in_training,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'BLACKLISTED') as blacklisted,
    (SELECT COUNT(*) FROM blacklist WHERE reason = 'Expelled from NICHE Training') as expelled_in_blacklist;

-- 6. Check for remaining duplicates (should be 0)
WITH phone_counts AS (
    SELECT 
        normalize_phone_niche(phone) as norm_phone,
        COUNT(*) as count
    FROM (
        SELECT phone FROM niche_candidates WHERE phone IS NOT NULL AND phone != ''
        UNION ALL
        SELECT phone FROM niche_training WHERE phone IS NOT NULL AND phone != ''
    ) all_phones
    GROUP BY normalize_phone_niche(phone)
    HAVING COUNT(*) > 1
)
SELECT 
    'Remaining duplicates check' as check_type,
    COUNT(*) as duplicate_phone_numbers,
    COALESCE(SUM(count), 0) as total_duplicate_records
FROM phone_counts;

-- 7. Test the force sync function
SELECT 'Testing force sync function...' as test_step;
SELECT * FROM force_sync_niche_candidates() LIMIT 5;

-- 8. Show status distribution
SELECT 
    'Status distribution after sync' as info,
    status,
    COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- 9. Show blacklist entries
SELECT 
    'Blacklist entries' as info,
    reason,
    COUNT(*) as count
FROM blacklist
GROUP BY reason
ORDER BY count DESC;

-- If everything shows 0 duplicates, functions exist, and blacklist table exists, the setup is complete! 🎉