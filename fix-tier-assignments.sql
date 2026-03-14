-- Fix tier assignments for Cohort 3 based on correct final scores
-- Tier system: 90+ = MASTER, 80+ = DISTINGUISHED, <80 = EXCEPTIONAL

UPDATE trainee_grades 
SET 
  tier = CASE 
    WHEN final_score::numeric >= 90 THEN 'MASTER'
    WHEN final_score::numeric >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8';

-- Verify the corrected tiers
SELECT 
  id,
  pillar1_score,
  pillar2_score,
  pillar3_score,
  pillar4_score,
  final_score,
  tier,
  training_type,
  CASE 
    WHEN final_score::numeric >= 90 THEN 'Should be MASTER'
    WHEN final_score::numeric >= 80 THEN 'Should be DISTINGUISHED'
    ELSE 'Should be EXCEPTIONAL'
  END as correct_tier
FROM trainee_grades 
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8'
ORDER BY training_type, final_score::numeric DESC;