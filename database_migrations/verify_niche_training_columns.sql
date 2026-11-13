-- Verify niche_training table structure and check for missing columns

-- 1. Show all columns in niche_training
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'niche_training'
ORDER BY ordinal_position;

-- 2. Check specifically for the columns the app is trying to use
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'candidate_id'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as candidate_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'name'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as name,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'phone'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as phone,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'role'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as role,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'status'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'course'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as course,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'cohort_id'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as cohort_id,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'training_type'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as training_type,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'training_category'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as training_category,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'enrolled_courses'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as enrolled_courses,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'created_by'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as created_by,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'niche_training' AND column_name = 'updated_by'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as updated_by;

-- 3. Check if the update migration has been run
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'niche_training' 
    AND column_name IN ('training_type', 'training_category', 'enrolled_courses')
) as migration_applied;
