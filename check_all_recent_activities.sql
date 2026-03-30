-- Check current updates table for NICHE activities
SELECT 
    'UPDATES_TABLE' as source,
    COUNT(*) as total_records,
    MAX(created_at) as latest_activity
FROM updates 
WHERE linked_to_type = 'niche_training';

-- Get recent updates from updates table
SELECT 
    'RECENT_UPDATES' as type,
    update_text,
    created_at,
    user_id,
    linked_to_id
FROM updates 
WHERE linked_to_type = 'niche_training'
ORDER BY created_at DESC 
LIMIT 20;

-- Check for recent activities in niche_training table (status changes, new records)
SELECT 
    'TRAINING_ACTIVITIES' as type,
    'New trainee: ' || name || ' (' || status || ')' as activity,
    created_at,
    'system' as user_id
FROM niche_training 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for recent activities in niche_candidates table
SELECT 
    'CANDIDATE_ACTIVITIES' as type,
    'Candidate status: ' || name || ' -> ' || status as activity,
    created_at,
    'system' as user_id
FROM niche_candidates 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for recent grading activities
SELECT 
    'GRADING_ACTIVITIES' as type,
    'Grade recorded for: ' || trainee_name as activity,
    created_at,
    grader_name as user_id
FROM niche_grades 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for recent payment activities
SELECT 
    'PAYMENT_ACTIVITIES' as type,
    'Payment received: KES ' || amount as activity,
    payment_date as created_at,
    'system' as user_id
FROM niche_payments 
ORDER BY payment_date DESC 
LIMIT 10;