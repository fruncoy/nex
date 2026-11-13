-- Clean up NICHE Training table - Remove "Pending" candidates
-- Only keep Active, Graduated, and Expelled trainees in the training system

BEGIN;

-- Step 1: Show current training status breakdown
SELECT 
  'Current training status breakdown' as info,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Step 2: Show pending candidates that will be removed
SELECT 
  'Pending candidates to be REMOVED from training' as info,
  name,
  phone,
  status,
  cohort_id,
  created_at
FROM niche_training
WHERE status = 'Pending'
ORDER BY created_at DESC;

-- Step 3: Verify these pending candidates exist in niche_candidates as "Pending Cohort"
SELECT 
  'Pending training candidates status in niche_candidates' as verification,
  nt.name as training_name,
  nt.status as training_status,
  nc.status as candidate_status
FROM niche_training nt
LEFT JOIN niche_candidates nc ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.status = 'Pending'
ORDER BY nt.name;

-- Step 4: DELETE pending candidates from niche_training
-- They should only exist in niche_candidates as "Pending Cohort"
DELETE FROM niche_training
WHERE status = 'Pending';

-- Step 5: Show final training status breakdown (should only have Active, Graduated, Expelled)
SELECT 
  'FINAL training status breakdown' as result,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Step 6: Show total trainees remaining in training system
SELECT 
  'Total trainees remaining in training system' as summary,
  COUNT(*) as total_trainees
FROM niche_training;

-- Step 7: Verify the pending candidates still exist in niche_candidates as "Pending Cohort"
SELECT 
  'Pending candidates now only in niche_candidates' as verification,
  COUNT(*) as pending_cohort_count
FROM niche_candidates
WHERE status = 'Pending Cohort';

COMMIT;

-- Summary of what this accomplishes:
-- ✅ Removes "Pending" status from niche_training (they shouldn't be there)
-- ✅ Keeps only actual trainees: Active, Graduated, Expelled
-- ✅ Pending candidates remain in niche_candidates as "Pending Cohort"
-- ✅ Clean separation: Candidates table = pipeline, Training table = actual trainees