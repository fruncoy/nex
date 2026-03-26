-- Check what NICHE tables exist for recent activities
-- Recent training activities
SELECT 
    'TRAINING_ACTIVITIES' as type,
    'New trainee: ' || name || ' (' || status || ')' as activity,
    created_at,
    'system' as user_id
FROM niche_training 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent candidate activities  
SELECT 
    'CANDIDATE_ACTIVITIES' as type,
    'Candidate: ' || name || ' -> ' || status as activity,
    created_at,
    'system' as user_id
FROM niche_candidates 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent grading activities
SELECT 
    'GRADING_ACTIVITIES' as type,
    'Grade: ' || trainee_name || ' - ' || COALESCE(total_score::text, 'N/A') as activity,
    created_at,
    grader_name as user_id
FROM niche_grades 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent payment activities
SELECT 
    'PAYMENT_ACTIVITIES' as type,
    'Payment: KES ' || amount || ' received' as activity,
    payment_date as created_at,
    'system' as user_id
FROM niche_payments 
ORDER BY payment_date DESC 
LIMIT 10;

-- Recent cohort activities
SELECT 
    'COHORT_ACTIVITIES' as type,
    'Cohort: ' || cohort_number || ' (' || status || ')' as activity,
    created_at,
    'system' as user_id
FROM niche_cohorts 
ORDER BY created_at DESC 
LIMIT 5;