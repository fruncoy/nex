-- Test INSERT permissions for niche_training
-- This will identify if there's a column-level permission issue

-- 1. Check table structure - verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'niche_training'
ORDER BY ordinal_position;

-- 2. Check if there are any column-level grants/restrictions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'niche_training';

-- 3. Test a simple insert with minimal columns
DO $$
DECLARE
  test_cohort_id uuid;
BEGIN
  SELECT id INTO test_cohort_id FROM niche_cohorts ORDER BY created_at DESC LIMIT 1;
  
  INSERT INTO niche_training (
    name,
    status,
    created_by,
    updated_by
  ) VALUES (
    'Minimal Test',
    'Active',
    'Test',
    'Test'
  );
  
  RAISE NOTICE 'Minimal insert SUCCESS';
  RAISE EXCEPTION 'Rolling back';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Rolling back%' THEN
      RAISE NOTICE 'Test passed - minimal columns work';
    ELSE
      RAISE NOTICE 'Minimal insert FAILED: %', SQLERRM;
    END IF;
END $$;

-- 4. Test with all the columns your app is trying to insert
DO $$
DECLARE
  test_cohort_id uuid;
BEGIN
  SELECT id INTO test_cohort_id FROM niche_cohorts ORDER BY created_at DESC LIMIT 1;
  
  INSERT INTO niche_training (
    candidate_id,
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
    NULL,
    'Full Test',
    '0700000000',
    'Nanny',
    'Active',
    'Test Course',
    test_cohort_id,
    '2week',
    '2-Week Flagship',
    NULL,
    'Test User',
    'Test User'
  );
  
  RAISE NOTICE 'Full insert SUCCESS';
  RAISE EXCEPTION 'Rolling back';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Rolling back%' THEN
      RAISE NOTICE 'Test passed - all columns work';
    ELSE
      RAISE NOTICE 'Full insert FAILED: %', SQLERRM;
    END IF;
END $$;

-- 5. Check if the columns the app is trying to use actually exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'niche_training' AND column_name = 'candidate_id') THEN '✓' ELSE '✗' END as candidate_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'niche_training' AND column_name = 'training_type') THEN '✓' ELSE '✗' END as training_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'niche_training' AND column_name = 'training_category') THEN '✓' ELSE '✗' END as training_category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'niche_training' AND column_name = 'enrolled_courses') THEN '✓' ELSE '✗' END as enrolled_courses,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'niche_training' AND column_name = 'cohort_id') THEN '✓' ELSE '✗' END as cohort_id;
