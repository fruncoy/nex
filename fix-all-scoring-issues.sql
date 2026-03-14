-- Fix the scoring issues properly
-- Cohort 3 (437b4d78) should have normal scores, older cohort (f91ca560) needs deflation

-- First, restore Cohort 3 records that we accidentally broke
-- These pillar scores (16-25) are already correct, just need proper weighted calculation

-- Restore Cohort 3 House Manager records with correct House Manager weights (30%, 30%, 25%, 15%)
UPDATE trainee_grades 
SET 
  pillar1_weighted = pillar1_score * 1.2,  -- 30% weight = score * 1.2 to get weighted score
  pillar2_weighted = pillar2_score * 1.2,  -- 30% weight = score * 1.2
  pillar3_weighted = pillar3_score * 1.0,  -- 25% weight = score * 1.0  
  pillar4_weighted = pillar4_score * 0.6,  -- 15% weight = score * 0.6
  final_score = (pillar1_score * 1.2) + (pillar2_score * 1.2) + (pillar3_score * 1.0) + (pillar4_score * 0.6),
  tier = CASE 
    WHEN ((pillar1_score * 1.2) + (pillar2_score * 1.2) + (pillar3_score * 1.0) + (pillar4_score * 0.6)) >= 95 THEN 'MASTER'
    WHEN ((pillar1_score * 1.2) + (pillar2_score * 1.2) + (pillar3_score * 1.0) + (pillar4_score * 0.6)) >= 90 THEN 'MASTER'
    WHEN ((pillar1_score * 1.2) + (pillar2_score * 1.2) + (pillar3_score * 1.0) + (pillar4_score * 0.6)) >= 80 THEN 'DISTINGUISHED'
    WHEN ((pillar1_score * 1.2) + (pillar2_score * 1.2) + (pillar3_score * 1.0) + (pillar4_score * 0.6)) >= 70 THEN 'EXCEPTIONAL'
    ELSE 'EXCELLENT'
  END,
  updated_at = NOW()
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8' AND training_type = 'house_manager';

-- Restore Cohort 3 Nanny record with correct Nanny weights (45%, 30%, 15%, 10%)
UPDATE trainee_grades 
SET 
  pillar1_weighted = pillar1_score * 1.8,  -- 45% weight = score * 1.8
  pillar2_weighted = pillar2_score * 1.2,  -- 30% weight = score * 1.2
  pillar3_weighted = pillar3_score * 0.6,  -- 15% weight = score * 0.6
  pillar4_weighted = pillar4_score * 0.4,  -- 10% weight = score * 0.4
  final_score = (pillar1_score * 1.8) + (pillar2_score * 1.2) + (pillar3_score * 0.6) + (pillar4_score * 0.4),
  tier = CASE 
    WHEN ((pillar1_score * 1.8) + (pillar2_score * 1.2) + (pillar3_score * 0.6) + (pillar4_score * 0.4)) >= 95 THEN 'MASTER'
    WHEN ((pillar1_score * 1.8) + (pillar2_score * 1.2) + (pillar3_score * 0.6) + (pillar4_score * 0.4)) >= 90 THEN 'MASTER'
    WHEN ((pillar1_score * 1.8) + (pillar2_score * 1.2) + (pillar3_score * 0.6) + (pillar4_score * 0.4)) >= 80 THEN 'DISTINGUISHED'
    WHEN ((pillar1_score * 1.8) + (pillar2_score * 1.2) + (pillar3_score * 0.6) + (pillar4_score * 0.4)) >= 70 THEN 'EXCEPTIONAL'
    ELSE 'EXCELLENT'
  END,
  updated_at = NOW()
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8' AND training_type = 'nanny';

-- Now fix the OLDER cohort (f91ca560) with inflated scores by deflating them
-- Divide pillar scores by 4 to get normal range, then apply correct weights

-- Fix older cohort Nanny records
UPDATE trainee_grades 
SET 
  pillar1_score = ROUND(pillar1_score / 4.0),
  pillar2_score = ROUND(pillar2_score / 4.0),
  pillar3_score = ROUND(pillar3_score / 4.0),
  pillar4_score = ROUND(pillar4_score / 4.0),
  pillar1_weighted = ROUND(pillar1_score / 4.0) * 1.8,  -- 45% weight
  pillar2_weighted = ROUND(pillar2_score / 4.0) * 1.2,  -- 30% weight
  pillar3_weighted = ROUND(pillar3_score / 4.0) * 0.6,  -- 15% weight
  pillar4_weighted = ROUND(pillar4_score / 4.0) * 0.4,  -- 10% weight
  final_score = (ROUND(pillar1_score / 4.0) * 1.8) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 0.6) + (ROUND(pillar4_score / 4.0) * 0.4),
  tier = CASE 
    WHEN ((ROUND(pillar1_score / 4.0) * 1.8) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 0.6) + (ROUND(pillar4_score / 4.0) * 0.4)) >= 95 THEN 'MASTER'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.8) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 0.6) + (ROUND(pillar4_score / 4.0) * 0.4)) >= 90 THEN 'MASTER'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.8) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 0.6) + (ROUND(pillar4_score / 4.0) * 0.4)) >= 80 THEN 'DISTINGUISHED'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.8) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 0.6) + (ROUND(pillar4_score / 4.0) * 0.4)) >= 70 THEN 'EXCEPTIONAL'
    ELSE 'EXCELLENT'
  END,
  updated_at = NOW()
WHERE cohort_id = 'f91ca560-495a-40fa-a785-1a2fdc255ed6' AND training_type = 'nanny';

-- Fix older cohort House Manager record
UPDATE trainee_grades 
SET 
  pillar1_score = ROUND(pillar1_score / 4.0),
  pillar2_score = ROUND(pillar2_score / 4.0),
  pillar3_score = ROUND(pillar3_score / 4.0),
  pillar4_score = ROUND(pillar4_score / 4.0),
  pillar1_weighted = ROUND(pillar1_score / 4.0) * 1.2,  -- 30% weight
  pillar2_weighted = ROUND(pillar2_score / 4.0) * 1.2,  -- 30% weight
  pillar3_weighted = ROUND(pillar3_score / 4.0) * 1.0,  -- 25% weight
  pillar4_weighted = ROUND(pillar4_score / 4.0) * 0.6,  -- 15% weight
  final_score = (ROUND(pillar1_score / 4.0) * 1.2) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 1.0) + (ROUND(pillar4_score / 4.0) * 0.6),
  tier = CASE 
    WHEN ((ROUND(pillar1_score / 4.0) * 1.2) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 1.0) + (ROUND(pillar4_score / 4.0) * 0.6)) >= 95 THEN 'MASTER'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.2) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 1.0) + (ROUND(pillar4_score / 4.0) * 0.6)) >= 90 THEN 'MASTER'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.2) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 1.0) + (ROUND(pillar4_score / 4.0) * 0.6)) >= 80 THEN 'DISTINGUISHED'
    WHEN ((ROUND(pillar1_score / 4.0) * 1.2) + (ROUND(pillar2_score / 4.0) * 1.2) + (ROUND(pillar3_score / 4.0) * 1.0) + (ROUND(pillar4_score / 4.0) * 0.6)) >= 70 THEN 'EXCEPTIONAL'
    ELSE 'EXCELLENT'
  END,
  updated_at = NOW()
WHERE cohort_id = 'f91ca560-495a-40fa-a785-1a2fdc255ed6' AND training_type = 'house_manager';

-- Verify all records are now correct
SELECT 
  cohort_id,
  training_type,
  pillar1_score,
  pillar2_score,
  pillar3_score,
  pillar4_score,
  pillar1_weighted,
  pillar2_weighted,
  pillar3_weighted,
  pillar4_weighted,
  final_score,
  tier
FROM trainee_grades 
ORDER BY cohort_id, training_type, final_score DESC;