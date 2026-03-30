-- Complete NICHE Training Grades Import
-- Delete existing data
DELETE FROM niche_subpillar_grades;
DELETE FROM trainee_grades;

-- COHORT I HOUSE MANAGERS (6 candidates)

-- Emily Gatabi - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 25, 23, 25, 25, 30.0, 27.6, 25.0, 15.0, 97.6, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Emily Gatabi' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 FROM grade_insert;

-- Evelyn Naimutie Olesampu - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 22, 24, 25, 23, 26.4, 28.8, 25.0, 13.8, 94.0, 'DISTINGUISHED', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Evelyn Naimutie Olesampu' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 4, 4, 4, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5 FROM grade_insert;

-- Mary Njeri - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 22, 23, 21, 23, 26.4, 27.6, 21.0, 13.8, 88.8, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Mary Njeri' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 4, 4, 5, 4, 5, 5, 4, 5, 4 FROM grade_insert;

-- Dianah Faith Washiali - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 21, 23, 21, 21, 25.2, 27.6, 21.0, 12.6, 86.4, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Dianah Faith Washiali' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 5, 4, 4, 4, 5, 4, 5, 5, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 5 FROM grade_insert;

-- Keziah Wanjiku Thabu - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 21, 18, 19, 23, 25.2, 21.6, 19.0, 13.8, 79.6, 'EXCELLENT', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Keziah Wanjiku Thabu' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 5, 4, 4, 4, 4, 4, 4, 3, 3, 4, 4, 3, 4, 4, 4, 5, 5, 5, 4 FROM grade_insert;

-- Doricas Simiyu - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 16, 20, 18, 20, 19.2, 24.0, 18.0, 12.0, 73.2, 'EXCELLENT', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Doricas Simiyu' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 2, 4, 4, 3, 3, 5, 3, 4, 5, 3, 3, 3, 3, 4, 5, 3, 4, 4, 4, 5 FROM grade_insert;

-- COHORT I NANNY (1 candidate)

-- Beatrice Amondi Owiti - Nanny
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'nanny', 17, 19, 21, 19, 30.6, 22.8, 12.6, 7.6, 73.6, 'EXCELLENT', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Beatrice Amondi Owiti' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid, receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability, child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care, child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep)
SELECT id, 3, 4, 3, 4, 3, 4, 4, 3, 4, 4, 4, 4, 5, 4, 4, 3, 3, 4, 4, 5 FROM grade_insert;

-- COHORT II HOUSE MANAGERS (8 candidates)

-- Esther Nyaboke - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 24, 24, 25, 25, 28.8, 28.8, 25.0, 15.0, 97.6, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Esther Nyaboke' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 FROM grade_insert;

-- Lilian Esami - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 25, 24, 25, 23, 30.0, 28.8, 25.0, 13.8, 97.6, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Lilian Esami' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5, 5 FROM grade_insert;

-- Margrate Waruguru Nduta - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 23, 25, 25, 24, 27.6, 30.0, 25.0, 14.4, 97.0, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Margrate Waruguru Nduta' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 4, 5, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 5 FROM grade_insert;

-- Rose Nafula Makari - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 21, 24, 23, 25, 25.2, 28.8, 23.0, 15.0, 92.0, 'DISTINGUISHED', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Rose Nafula Makari' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 4, 4, 4, 5, 5, 5, 5, 4, 5, 5, 5, 4, 4, 5, 5, 5, 5, 5, 5 FROM grade_insert;

-- Valine Auma Odondi - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 20, 23, 24, 23, 24.0, 27.6, 24.0, 13.8, 89.4, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Valine Auma Odondi' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 3, 3, 5, 5, 5, 5, 4, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4 FROM grade_insert;

-- Elizabeth Wanjiku Kangethe - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 20, 23, 22, 25, 24.0, 27.6, 22.0, 15.0, 88.6, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Elizabeth Wanjiku Kangethe' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 4, 3, 5, 4, 5, 5, 4, 4, 5, 4, 5, 4, 4, 5, 5, 5, 5, 5, 5 FROM grade_insert;

-- Alice Wambui - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 21, 22, 19, 22, 25.2, 26.4, 19.0, 13.2, 83.8, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Alice Wambui' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 5, 4, 5, 3, 4, 5, 4, 4, 5, 4, 4, 3, 3, 5, 4, 5, 4, 5, 4 FROM grade_insert;

-- Selina Musita - House Manager
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 15, 22, 24, 23, 18.0, 26.4, 24.0, 13.8, 82.2, 'EXCEPTIONAL', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Selina Musita' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 4, 3, 3, 2, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 4, 4 FROM grade_insert;

-- COHORT II NANNIES (2 candidates)

-- Esther Kitivo - Nanny
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'nanny', 25, 24, 24, 24, 45.0, 28.8, 14.4, 9.6, 97.8, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Esther Kitivo' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid, receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability, child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care, child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep)
SELECT id, 5, 5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 4, 5, 5, 4, 5, 5 FROM grade_insert;

-- Gentrix Lusinde Mwori - Nanny
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'nanny', 24, 25, 24, 24, 43.2, 30.0, 14.4, 9.6, 97.2, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Gentrix Lusinde Mwori' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid, receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability, child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care, child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep)
SELECT id, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5, 5, 5, 5 FROM grade_insert;

-- Summary: 16 total candidates
-- Cohort I: 6 House Managers + 1 Nanny = 7 candidates
-- Cohort II: 7 House Managers + 2 Nannies = 9 candidates
-- Total: 7 + 9 = 16 candidates with complete grades and sub-pillar data

-- Tables are linked via:
-- trainee_grades.id -> niche_subpillar_grades.grade_id (foreign key)