-- Check which NICHE tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'niche_%'
ORDER BY table_name;

-- Test each table individually
-- niche_training
SELECT 
    'TRAINING' as type,
    COUNT(*) as total_records,
    MAX(created_at) as latest_record
FROM niche_training;

-- niche_candidates  
SELECT 
    'CANDIDATES' as type,
    COUNT(*) as total_records,
    MAX(created_at) as latest_record
FROM niche_candidates;

-- niche_payments
SELECT 
    'PAYMENTS' as type,
    COUNT(*) as total_records,
    MAX(payment_date) as latest_record
FROM niche_payments;

-- niche_cohorts
SELECT 
    'COHORTS' as type,
    COUNT(*) as total_records,
    MAX(created_at) as latest_record
FROM niche_cohorts;