-- RECOVERY SQL: Insert 4 missing candidates into niche_training, niche_candidates,
-- trainee_grades, and niche_subpillar_grades
-- Missing: Mary Njeri (C1 HM), Beatrice Amondi Owiti (C1 Nanny),
--          Esther Nyaboke (C2 HM), Esther Kitivo (C2 Nanny)

BEGIN;

-- =====================================================
-- STEP 1: INSERT INTO niche_training
-- =====================================================

INSERT INTO niche_training (name, phone, role, status, training_type, cohort_id, created_at)
SELECT 
  'Mary Njeri', '+254700000001', 'House Manager', 'Graduated', '2week',
  (SELECT id FROM niche_cohorts WHERE cohort_number = 1),
  '2026-02-02'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_training WHERE name ILIKE '%mary%njeri%');

INSERT INTO niche_training (name, phone, role, status, training_type, cohort_id, created_at)
SELECT 
  'Beatrice Amondi Owiti', '+254700000002', 'Nanny', 'Graduated', '2week',
  (SELECT id FROM niche_cohorts WHERE cohort_number = 1),
  '2026-02-02'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_training WHERE name ILIKE '%beatrice%amondi%');

INSERT INTO niche_training (name, phone, role, status, training_type, cohort_id, created_at)
SELECT 
  'Esther Nyaboke', '+254700000003', 'House Manager', 'Graduated', '2week',
  (SELECT id FROM niche_cohorts WHERE cohort_number = 2),
  '2026-02-16'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_training WHERE name ILIKE '%esther%nyaboke%');

INSERT INTO niche_training (name, phone, role, status, training_type, cohort_id, created_at)
SELECT 
  'Esther Kitivo', '+254700000004', 'Nanny', 'Graduated', '2week',
  (SELECT id FROM niche_cohorts WHERE cohort_number = 2),
  '2026-02-16'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_training WHERE name ILIKE '%esther%kitivo%');

-- =====================================================
-- STEP 2: INSERT INTO niche_candidates (sync)
-- The trigger should handle this automatically, but we ensure it here
-- =====================================================

INSERT INTO niche_candidates (name, phone, source, role, inquiry_date, status, added_by, category, created_at)
SELECT 
  'Mary Njeri', '+254700000001', 'NICHE Training', 'House Manager',
  '2026-02-02'::date, 'Graduated', 'SYSTEM_RECOVERY', '2-Week Flagship', '2026-02-02'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_candidates WHERE phone = '+254700000001');

INSERT INTO niche_candidates (name, phone, source, role, inquiry_date, status, added_by, category, created_at)
SELECT 
  'Beatrice Amondi Owiti', '+254700000002', 'NICHE Training', 'Nanny',
  '2026-02-02'::date, 'Graduated', 'SYSTEM_RECOVERY', '2-Week Flagship', '2026-02-02'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_candidates WHERE phone = '+254700000002');

INSERT INTO niche_candidates (name, phone, source, role, inquiry_date, status, added_by, category, created_at)
SELECT 
  'Esther Nyaboke', '+254700000003', 'NICHE Training', 'House Manager',
  '2026-02-16'::date, 'Graduated', 'SYSTEM_RECOVERY', '2-Week Flagship', '2026-02-16'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_candidates WHERE phone = '+254700000003');

INSERT INTO niche_candidates (name, phone, source, role, inquiry_date, status, added_by, category, created_at)
SELECT 
  'Esther Kitivo', '+254700000004', 'NICHE Training', 'Nanny',
  '2026-02-16'::date, 'Graduated', 'SYSTEM_RECOVERY', '2-Week Flagship', '2026-02-16'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM niche_candidates WHERE phone = '+254700000004');

-- =====================================================
-- STEP 3: INSERT trainee_grades + niche_subpillar_grades
-- HM weights: P1(Prof)×1.2, P2(HK)×1.2, P3(Kitchen)×1.0, P4(Childcare)×0.6
-- Nanny weights: P1(Childcare)×1.8, P2(Prof)×1.2, P3(HK)×0.6, P4(Cooking)×0.4
-- Tier: MASTER≥95, DISTINGUISHED≥90, EXCEPTIONAL≥80, EXCELLENT≥70
-- =====================================================

-- Mary Njeri - Cohort 1 HM
-- Raw: P1=22, P2=23, P3=25, P4=23 → 26.4+27.6+25.0+13.8 = 92.8 → DISTINGUISHED
-- Subpillars: P1(22)=5+4+5+4+4, P2(23)=5+5+4+5+4, P3(25)=5+5+5+5+5, P4(23)=5+5+4+5+4
WITH grade_insert AS (
  INSERT INTO trainee_grades (
    trainee_id, cohort_id, training_type,
    pillar1_score, pillar2_score, pillar3_score, pillar4_score,
    pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted,
    final_score, tier, graded_by
  )
  SELECT 
    nt.id, nc.id, 'house_manager',
    22, 23, 25, 23,
    26.4, 27.6, 25.0, 13.8,
    92.8, 'DISTINGUISHED', 'System Recovery'
  FROM niche_training nt
  JOIN niche_cohorts nc ON nt.cohort_id = nc.id
  WHERE nt.name = 'Mary Njeri' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (
  grade_id,
  authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making,
  cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing,
  kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance,
  child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness
)
SELECT id, 5,4,5,4,4, 5,5,4,5,4, 5,5,5,5,5, 5,5,4,5,4 FROM grade_insert;

-- Beatrice Amondi Owiti - Cohort 1 Nanny
-- Raw: P1(Childcare)=17, P2(Prof)=19, P3(HK)=21, P4(Cooking)=19
-- Weighted: 17×1.8=30.6, 19×1.2=22.8, 21×0.6=12.6, 19×0.4=7.6 = 73.6 → EXCELLENT
-- Subpillars: P1(17)=3+4+3+4+3, P2(19)=4+4+3+4+4, P3(21)=4+4+5+4+4, P4(19)=3+3+4+4+5
WITH grade_insert AS (
  INSERT INTO trainee_grades (
    trainee_id, cohort_id, training_type,
    pillar1_score, pillar2_score, pillar3_score, pillar4_score,
    pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted,
    final_score, tier, graded_by
  )
  SELECT 
    nt.id, nc.id, 'nanny',
    17, 19, 21, 19,
    30.6, 22.8, 12.6, 7.6,
    73.6, 'EXCELLENT', 'System Recovery'
  FROM niche_training nt
  JOIN niche_cohorts nc ON nt.cohort_id = nc.id
  WHERE nt.name = 'Beatrice Amondi Owiti' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (
  grade_id,
  child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid,
  receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability,
  child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care,
  child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep
)
SELECT id, 3,4,3,4,3, 4,4,3,4,4, 4,4,5,4,4, 3,3,4,4,5 FROM grade_insert;

-- Esther Nyaboke - Cohort 2 HM
-- Raw: P1=24, P2=24, P3=25, P4=25 → 28.8+28.8+25.0+15.0 = 97.6 → MASTER
-- Subpillars: P1(24)=5+5+5+4+5, P2(24)=5+5+5+4+5, P3(25)=5+5+5+5+5, P4(25)=5+5+5+5+5
WITH grade_insert AS (
  INSERT INTO trainee_grades (
    trainee_id, cohort_id, training_type,
    pillar1_score, pillar2_score, pillar3_score, pillar4_score,
    pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted,
    final_score, tier, graded_by
  )
  SELECT 
    nt.id, nc.id, 'house_manager',
    24, 24, 25, 25,
    28.8, 28.8, 25.0, 15.0,
    97.6, 'MASTER', 'System Recovery'
  FROM niche_training nt
  JOIN niche_cohorts nc ON nt.cohort_id = nc.id
  WHERE nt.name = 'Esther Nyaboke' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (
  grade_id,
  authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making,
  cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing,
  kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance,
  child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness
)
SELECT id, 5,5,5,4,5, 5,5,5,4,5, 5,5,5,5,5, 5,5,5,5,5 FROM grade_insert;

-- Esther Kitivo - Cohort 2 Nanny
-- Raw: P1(Childcare)=25, P2(Prof)=24, P3(HK)=24, P4(Cooking)=24
-- Weighted: 25×1.8=45.0, 24×1.2=28.8, 24×0.6=14.4, 24×0.4=9.6 = 97.8 → MASTER
-- Subpillars: P1(25)=5+5+5+5+5, P2(24)=5+5+5+4+5, P3(24)=5+5+5+5+4, P4(24)=5+5+4+5+5
WITH grade_insert AS (
  INSERT INTO trainee_grades (
    trainee_id, cohort_id, training_type,
    pillar1_score, pillar2_score, pillar3_score, pillar4_score,
    pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted,
    final_score, tier, graded_by
  )
  SELECT 
    nt.id, nc.id, 'nanny',
    25, 24, 24, 24,
    45.0, 28.8, 14.4, 9.6,
    97.8, 'MASTER', 'System Recovery'
  FROM niche_training nt
  JOIN niche_cohorts nc ON nt.cohort_id = nc.id
  WHERE nt.name = 'Esther Kitivo' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (
  grade_id,
  child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid,
  receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability,
  child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care,
  child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep
)
SELECT id, 5,5,5,5,5, 5,5,4,5,5, 5,5,5,5,4, 5,5,4,5,5 FROM grade_insert;

-- =====================================================
-- STEP 4: VERIFY
-- =====================================================

SELECT 
  nc.cohort_number,
  nt.name,
  nt.role,
  tg.final_score,
  tg.tier
FROM niche_training nt
JOIN niche_cohorts nc ON nt.cohort_id = nc.id
LEFT JOIN trainee_grades tg ON tg.trainee_id = nt.id
WHERE nt.name IN ('Mary Njeri', 'Beatrice Amondi Owiti', 'Esther Nyaboke', 'Esther Kitivo')
ORDER BY nc.cohort_number, nt.name;

COMMIT;
