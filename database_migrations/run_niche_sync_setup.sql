-- RUN THIS SCRIPT TO IMPLEMENT DUPLICATE PREVENTION AND AUTO-SYNC
-- Execute this in your Supabase SQL editor or database client

-- First, run the main migration
\\i 'database_migrations/fix_niche_duplicates_and_sync.sql'

-- Then verify the setup worked
SELECT 'VERIFICATION: Functions created' as check_step;

-- Check if functions exist
SELECT 
    'Functions created successfully' as result,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_name IN (
    'normalize_phone_niche',
    'sync_niche_training_to_candidates', 
    'prevent_niche_training_duplicates',
    'force_sync_niche_candidates'
);

-- Check if triggers exist
SELECT 
    'Triggers created successfully' as result,
    COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name IN (
    'sync_training_to_candidates_trigger',
    'prevent_training_duplicates_trigger'
);

-- Show current sync status
SELECT 
    'Current sync status' as info,
    (SELECT COUNT(*) FROM niche_candidates) as total_candidates,
    (SELECT COUNT(*) FROM niche_training) as total_training,
    (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Active in Training') as active_in_training
;

-- Test the force sync function
SELECT 'Testing force sync function...' as test_step;
SELECT * FROM force_sync_niche_candidates() LIMIT 5;

SELECT 'Setup completed successfully! 🎉' as final_result;