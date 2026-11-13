-- Fix tier assignments for Cohort 3 based on correct 4-tier system
-- 70-79 = EXCEPTIONAL, 80-89 = DISTINGUISHED, 90-94 = MASTER, 95-100 = (highest tier)

UPDATE trainee_grades 
SET 
  tier = CASE 
    WHEN final_score::numeric >= 95 THEN 'ELITE'  -- or whatever the highest tier name is
    WHEN final_score::numeric >= 90 THEN 'MASTER'
    WHEN final_score::numeric >= 80 THEN 'DISTINGUISHED'
    WHEN final_score::numeric >= 70 THEN 'EXCEPTIONAL'
    ELSE 'NEEDS_IMPROVEMENT'  -- for scores below 70
  END,
  updated_at = NOW()
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8';

-- Verify the corrected tiers
SELECT 
  id,
  final_score,
  tier,
  training_type,
  CASE 
    WHEN final_score::numeric >= 95 THEN 'Should be ELITE/TOP'
    WHEN final_score::numeric >= 90 THEN 'Should be MASTER'
    WHEN final_score::numeric >= 80 THEN 'Should be DISTINGUISHED'
    WHEN final_score::numeric >= 70 THEN 'Should be EXCEPTIONAL'
    ELSE 'Should be NEEDS_IMPROVEMENT'
  END as correct_tier_range
FROM trainee_grades 
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8'
ORDER BY final_score::numeric DESC;