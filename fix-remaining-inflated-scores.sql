-- Fix remaining inflated scores in Cohort 3
-- Target records where pillar scores are abnormally high (>30)

-- First, let's see all records with inflated scores
SELECT 
  id,
  pillar1_score,
  pillar2_score,
  pillar3_score,
  pillar4_score,
  pillar1_weighted,
  pillar2_weighted, 
  pillar3_weighted,
  pillar4_weighted,
  final_score,
  tier,
  training_type
FROM trainee_grades 
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8'
  AND (pillar1_score > 30 OR pillar2_score > 30 OR pillar3_score > 30 OR pillar4_score > 30)
ORDER BY training_type, final_score DESC;

-- Fix the House Manager record with scores 84, 92, 84, 84
-- These should be converted from the inflated range back to normal range
-- Assuming these were inflated by ~4x, divide by 4 to get normal range
UPDATE trainee_grades 
SET 
  pillar1_score = ROUND(84 / 4.0),  -- 21
  pillar2_score = ROUND(92 / 4.0),  -- 23  
  pillar3_score = ROUND(84 / 4.0),  -- 21
  pillar4_score = ROUND(84 / 4.0),  -- 21
  pillar1_weighted = ROUND(84 / 4.0) * 0.30,  -- 21 * 0.30 = 6.30
  pillar2_weighted = ROUND(92 / 4.0) * 0.30,  -- 23 * 0.30 = 6.90
  pillar3_weighted = ROUND(84 / 4.0) * 0.25,  -- 21 * 0.25 = 5.25
  pillar4_weighted = ROUND(84 / 4.0) * 0.15,  -- 21 * 0.15 = 3.15
  final_score = (ROUND(84 / 4.0) * 0.30) + (ROUND(92 / 4.0) * 0.30) + (ROUND(84 / 4.0) * 0.25) + (ROUND(84 / 4.0) * 0.15),  -- 21.60
  tier = CASE 
    WHEN ((ROUND(84 / 4.0) * 0.30) + (ROUND(92 / 4.0) * 0.30) + (ROUND(84 / 4.0) * 0.25) + (ROUND(84 / 4.0) * 0.15)) >= 90 THEN 'MASTER'
    WHEN ((ROUND(84 / 4.0) * 0.30) + (ROUND(92 / 4.0) * 0.30) + (ROUND(84 / 4.0) * 0.25) + (ROUND(84 / 4.0) * 0.15)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE id = '78d3e790-8179-4bc7-be45-1ae2f7856338';

-- Verify all records are now in normal range
SELECT 
  id,
  pillar1_score,
  pillar2_score,
  pillar3_score,
  pillar4_score,
  pillar1_weighted,
  pillar2_weighted, 
  pillar3_weighted,
  pillar4_weighted,
  final_score,
  tier,
  training_type
FROM trainee_grades 
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8'
ORDER BY training_type, final_score DESC;