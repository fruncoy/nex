-- Fix Cohort 3 inflated scores with correct weighted calculations
-- Nanny weights: Childcare(45%), Professional(30%), Housekeeping(15%), Cooking(10%)
-- House Manager weights: Professional(30%), Housekeeping(30%), Cooking(25%), Childcare(15%)

-- Betty Macxwell Waniku (Nanny)
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
  END
WHERE grade_id = '9950464d-c00a-4180-9e99-10ff94afebbf';

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
  END
WHERE grade_id = '2e06f41e-dc6f-48ce-8ce9-8824c6327cb2';

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
  END
WHERE grade_id = '677b7a2f-29ee-466a-80a8-ee678de8a769';

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
  END
WHERE grade_id = '0acfc5f5-ff99-410b-b27c-4d6fa327bb12';

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
  END
WHERE grade_id = '5d8727be-77a6-4c87-bf0b-d45a7bf81fb3';

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
  END
WHERE grade_id = '4c5b1cc1-f820-462b-8f7a-ff092d01c424';

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
  END
WHERE grade_id = '2867fb91-1df4-431e-ad47-f395de5e73f6';

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
  END
WHERE grade_id = '15754920-b1f0-4659-8d32-da84464f0550';

-- Verify the updates
SELECT 
  grade_id,
  pillar1_weighted,
  pillar2_weighted, 
  pillar3_weighted,
  pillar4_weighted,
  final_score,
  tier
FROM trainee_grades 
WHERE grade_id IN (
  '9950464d-c00a-4180-9e99-10ff94afebbf',
  '2e06f41e-dc6f-48ce-8ce9-8824c6327cb2', 
  '677b7a2f-29ee-466a-80a8-ee678de8a769',
  '0acfc5f5-ff99-410b-b27c-4d6fa327bb12',
  '5d8727be-77a6-4c87-bf0b-d45a7bf81fb3',
  '4c5b1cc1-f820-462b-8f7a-ff092d01c424',
  '2867fb91-1df4-431e-ad47-f395de5e73f6',
  '15754920-b1f0-4659-8d32-da84464f0550'
);