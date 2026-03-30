-- Fix tier assignments to match the correct 4-tier system
-- MASTER: 95+, DISTINGUISHED: 90-94, EXCEPTIONAL: 80-89, EXCELLENT: 70-79

UPDATE trainee_grades 
SET 
  tier = CASE 
    WHEN final_score::numeric >= 95 THEN 'MASTER'
    WHEN final_score::numeric >= 90 THEN 'DISTINGUISHED'
    WHEN final_score::numeric >= 80 THEN 'EXCEPTIONAL'
    WHEN final_score::numeric >= 70 THEN 'EXCELLENT'
    ELSE 'NEEDS_IMPROVEMENT'
  END,
  updated_at = NOW();

-- Verify the corrected tiers
SELECT 
  trainee_id,
  final_score,
  tier,
  training_type,
  CASE 
    WHEN final_score::numeric >= 95 THEN 'Should be MASTER'
    WHEN final_score::numeric >= 90 THEN 'Should be DISTINGUISHED'
    WHEN final_score::numeric >= 80 THEN 'Should be EXCEPTIONAL'
    WHEN final_score::numeric >= 70 THEN 'Should be EXCELLENT'
    ELSE 'Should be NEEDS_IMPROVEMENT'
  END as correct_tier
FROM trainee_grades 
ORDER BY final_score::numeric DESC;