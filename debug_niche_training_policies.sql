-- Debug script to check policy details and test permissions

-- 1. Check detailed policy definitions including USING and WITH CHECK clauses
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'niche_training'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'niche_training';

-- 3. Test if you can select from the table (to verify authentication works)
SELECT COUNT(*) as total_records FROM niche_training;

-- 4. Check your current user and role
SELECT 
    current_user as "Current User",
    session_user as "Session User",
    current_role as "Current Role";

-- 5. Try a simple insert test (this will help identify the exact issue)
-- Replace with your actual values
DO $$
BEGIN
    -- Test insert
    INSERT INTO niche_training (
        name,
        phone,
        role,
        status,
        course,
        cohort_id,
        training_type,
        training_category,
        enrolled_courses,
        created_by,
        updated_by
    ) VALUES (
        'Test User',
        '0700000000',
        'Nanny',
        'Active',
        'Professional Nanny Training Program',
        (SELECT id FROM niche_cohorts ORDER BY created_at DESC LIMIT 1),
        '2week',
        '2-Week Flagship',
        NULL,
        'Test',
        'Test'
    );
    
    RAISE NOTICE 'Insert successful!';
    
    -- Rollback the test insert
    RAISE EXCEPTION 'Rolling back test insert';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Insert failed with error: %', SQLERRM;
END $$;
