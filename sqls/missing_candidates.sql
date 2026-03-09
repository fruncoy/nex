-- Missing 2 candidates from NICHE grading table

-- Emily Gatabi - House Manager (Cohort I)
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'house_manager', 25, 23, 25, 25, 30.0, 27.6, 25.0, 15.0, 97.6, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Emily Gatabi' AND nc.cohort_number = 1
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, authority_leadership, hm_communication, stress_management, discretion_confidentiality, decision_making, cleaning_standards, household_routines, organization_systems, housekeeping_appliances, laundry_ironing, kitchen_hygiene_safety, meal_planning, food_prep_presentation, storage_system, cleaning_maintenance, child_development_knowledge, routine_understanding, nanny_coordination, role_boundaries, safety_awareness)
SELECT id, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 FROM grade_insert;

-- Gentrix Lusinde Mwori - Nanny (Cohort II)
WITH grade_insert AS (
  INSERT INTO trainee_grades (trainee_id, cohort_id, training_type, pillar1_score, pillar2_score, pillar3_score, pillar4_score, pillar1_weighted, pillar2_weighted, pillar3_weighted, pillar4_weighted, final_score, tier, graded_by)
  SELECT nt.id, nc.id, 'nanny', 24, 25, 24, 24, 43.2, 30.0, 14.4, 9.6, 97.2, 'MASTER', 'System Import'
  FROM niche_training nt JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
  WHERE nt.name = 'Gentrix Lusinde Mwori' AND nc.cohort_number = 2
  RETURNING id
)
INSERT INTO niche_subpillar_grades (grade_id, child_hygiene_safety, routine_management, behavior_management, potty_training, first_aid, receives_correction, nanny_communication, emotional_control, boundaries_ethics, reliability, child_room_hygiene, toy_sanitation, bathroom_cleanliness, daily_reset, laundry_care, child_safe_food_prep, age_appropriate_meals, food_allergy_awareness, kitchen_hygiene_storage, family_food_prep)
SELECT id, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 5, 5, 5, 5 FROM grade_insert;