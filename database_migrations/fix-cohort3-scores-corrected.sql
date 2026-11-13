-- Fix Cohort 3 inflated scores with correct weighted calculations
-- Nanny weights: Childcare(45%), Professional(30%), Housekeeping(15%), Cooking(10%)
-- House Manager weights: Professional(30%), Housekeeping(30%), Cooking(25%), Childcare(15%)

-- Betty Macxwell Waniku (Nanny) - ID from your data
UPDATE trainee_grades 
SET 
  pillar1_weighted = 96 * 0.45,  -- 43.20
  pillar2_weighted = 96 * 0.30,  -- 28.80
  pillar3_weighted = 92 * 0.15,  -- 13.80
  pillar4_weighted = 68 * 0.10,  -- 6.80
  final_score = (96 * 0.45) + (96 * 0.30) + (92 * 0.15) + (68 * 0.10),  -- 92.60
  tier = CASE 
    WHEN ((96 * 0.45) + (96 * 0.30) + (92 * 0.15) + (68 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((96 * 0.45) + (96 * 0.30) + (92 * 0.15) + (68 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 96 AND pillar2_score = 96 AND pillar3_score = 92 AND pillar4_score = 68 AND training_type = 'nanny';

-- Caroline Lutebo (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 84 * 0.45,  -- 37.80
  pillar2_weighted = 96 * 0.30,  -- 28.80
  pillar3_weighted = 100 * 0.15, -- 15.00
  pillar4_weighted = 96 * 0.10,  -- 9.60
  final_score = (84 * 0.45) + (96 * 0.30) + (100 * 0.15) + (96 * 0.10),  -- 91.20
  tier = CASE 
    WHEN ((84 * 0.45) + (96 * 0.30) + (100 * 0.15) + (96 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((84 * 0.45) + (96 * 0.30) + (100 * 0.15) + (96 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 84 AND pillar2_score = 96 AND pillar3_score = 100 AND pillar4_score = 96 AND training_type = 'nanny';

-- Jacinta Wayua (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 88 * 0.45,  -- 39.60
  pillar2_weighted = 88 * 0.30,  -- 26.40
  pillar3_weighted = 96 * 0.15,  -- 14.40
  pillar4_weighted = 96 * 0.10,  -- 9.60
  final_score = (88 * 0.45) + (88 * 0.30) + (96 * 0.15) + (96 * 0.10),  -- 90.00
  tier = CASE 
    WHEN ((88 * 0.45) + (88 * 0.30) + (96 * 0.15) + (96 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((88 * 0.45) + (88 * 0.30) + (96 * 0.15) + (96 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 88 AND pillar2_score = 88 AND pillar3_score = 96 AND pillar4_score = 96 AND training_type = 'nanny';

-- Loice Were (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 68 * 0.45,  -- 30.60
  pillar2_weighted = 88 * 0.30,  -- 26.40
  pillar3_weighted = 68 * 0.15,  -- 10.20
  pillar4_weighted = 72 * 0.10,  -- 7.20
  final_score = (68 * 0.45) + (88 * 0.30) + (68 * 0.15) + (72 * 0.10),  -- 74.40
  tier = CASE 
    WHEN ((68 * 0.45) + (88 * 0.30) + (68 * 0.15) + (72 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((68 * 0.45) + (88 * 0.30) + (68 * 0.15) + (72 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 68 AND pillar2_score = 88 AND pillar3_score = 68 AND pillar4_score = 72 AND training_type = 'nanny';

-- Monica Wanjiku (House Manager)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 72 * 0.30,  -- 21.60
  pillar2_weighted = 84 * 0.30,  -- 25.20
  pillar3_weighted = 88 * 0.25,  -- 22.00
  pillar4_weighted = 88 * 0.15,  -- 13.20
  final_score = (72 * 0.30) + (84 * 0.30) + (88 * 0.25) + (88 * 0.15),  -- 82.00
  tier = CASE 
    WHEN ((72 * 0.30) + (84 * 0.30) + (88 * 0.25) + (88 * 0.15)) >= 90 THEN 'MASTER'
    WHEN ((72 * 0.30) + (84 * 0.30) + (88 * 0.25) + (88 * 0.15)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 72 AND pillar2_score = 84 AND pillar3_score = 88 AND pillar4_score = 88 AND training_type = 'house_manager';

-- Patricia Akinyi (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 80 * 0.45,  -- 36.00
  pillar2_weighted = 88 * 0.30,  -- 26.40
  pillar3_weighted = 76 * 0.15,  -- 11.40
  pillar4_weighted = 76 * 0.10,  -- 7.60
  final_score = (80 * 0.45) + (88 * 0.30) + (76 * 0.15) + (76 * 0.10),  -- 81.40
  tier = CASE 
    WHEN ((80 * 0.45) + (88 * 0.30) + (76 * 0.15) + (76 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((80 * 0.45) + (88 * 0.30) + (76 * 0.15) + (76 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 80 AND pillar2_score = 88 AND pillar3_score = 76 AND pillar4_score = 76 AND training_type = 'nanny';

-- Ritah Amimo (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 68 * 0.45,  -- 30.60
  pillar2_weighted = 84 * 0.30,  -- 25.20
  pillar3_weighted = 68 * 0.15,  -- 10.20
  pillar4_weighted = 76 * 0.10,  -- 7.60
  final_score = (68 * 0.45) + (84 * 0.30) + (68 * 0.15) + (76 * 0.10),  -- 73.60
  tier = CASE 
    WHEN ((68 * 0.45) + (84 * 0.30) + (68 * 0.15) + (76 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((68 * 0.45) + (84 * 0.30) + (68 * 0.15) + (76 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 68 AND pillar2_score = 84 AND pillar3_score = 68 AND pillar4_score = 76 AND training_type = 'nanny';

-- Sharline Awino (Nanny)
UPDATE trainee_grades 
SET 
  pillar1_weighted = 72 * 0.45,  -- 32.40
  pillar2_weighted = 88 * 0.30,  -- 26.40
  pillar3_weighted = 92 * 0.15,  -- 13.80
  pillar4_weighted = 76 * 0.10,  -- 7.60
  final_score = (72 * 0.45) + (88 * 0.30) + (92 * 0.15) + (76 * 0.10),  -- 80.20
  tier = CASE 
    WHEN ((72 * 0.45) + (88 * 0.30) + (92 * 0.15) + (76 * 0.10)) >= 90 THEN 'MASTER'
    WHEN ((72 * 0.45) + (88 * 0.30) + (92 * 0.15) + (76 * 0.10)) >= 80 THEN 'DISTINGUISHED'
    ELSE 'EXCEPTIONAL'
  END,
  updated_at = NOW()
WHERE pillar1_score = 72 AND pillar2_score = 88 AND pillar3_score = 92 AND pillar4_score = 76 AND training_type = 'nanny';

-- Verify the updates by showing all Cohort 3 records
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