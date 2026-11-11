-- Test authentication and permissions
-- Run this while logged into your app to debug auth issues

-- 1. Check what role the current connection has
SELECT current_setting('role') as current_role;

-- 2. Check if the JWT is setting the correct role
SELECT current_setting('request.jwt.claims', true) as jwt_claims;

-- 3. Test if you can read from niche_training
SELECT COUNT(*) as can_read_count FROM niche_training;

-- 4. Test if you can insert (this will rollback)
DO $$
DECLARE
  test_cohort_id uuid;
BEGIN
  -- Get a valid cohort ID
  SELECT id INTO test_cohort_id FROM niche_cohorts ORDER BY created_at DESC LIMIT 1;
  
  -- Try to insert
  INSERT INTO niche_training (
    name, phone, role, status, course, cohort_id, 
    training_type, training_category, created_by, updated_by
  ) VALUES (
    'Test Insert', '0700000000', 'Nanny', 'Active', 
    'Test Course', test_cohort_id, '2week', '2-Week Flagship',
    'Test User', 'Test User'
  );
  
  RAISE NOTICE 'INSERT SUCCESS: Authentication and permissions are working!';
  
  -- Rollback the test
  RAISE EXCEPTION 'Rolling back test insert';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Rolling back%' THEN
      RAISE NOTICE 'Test completed successfully - permissions are OK';
    ELSE
      RAISE NOTICE 'INSERT FAILED: %', SQLERRM;
    END IF;
END $$;
