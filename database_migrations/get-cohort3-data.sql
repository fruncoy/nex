-- SQL to get current Cohort 3 data for analysis
-- Run this first and send me the results

SELECT 
    tg.id as grade_id,
    nt.name,
    tg.training_type,
    tg.pillar1_score,
    tg.pillar2_score, 
    tg.pillar3_score,
    tg.pillar4_score,
    tg.pillar1_weighted,
    tg.pillar2_weighted,
    tg.pillar3_weighted,
    tg.pillar4_weighted,
    tg.final_score,
    tg.tier
FROM trainee_grades tg
JOIN niche_training nt ON tg.trainee_id = nt.id
JOIN niche_cohorts nc ON tg.cohort_id = nc.id
WHERE nc.cohort_number = 3
ORDER BY nt.name;

-- Also get the sub-pillar grades to understand the source data
SELECT 
    spg.grade_id,
    nt.name,
    tg.training_type,
    -- House Manager sub-pillars
    spg.authority_leadership,
    spg.hm_communication,
    spg.stress_management,
    spg.discretion_confidentiality,
    spg.decision_making,
    spg.cleaning_standards,
    spg.household_routines,
    spg.organization_systems,
    spg.housekeeping_appliances,
    spg.laundry_ironing,
    spg.kitchen_hygiene_safety,
    spg.meal_planning,
    spg.food_prep_presentation,
    spg.storage_system,
    spg.cleaning_maintenance,
    spg.child_development_knowledge,
    spg.routine_understanding,
    spg.nanny_coordination,
    spg.role_boundaries,
    spg.safety_awareness,
    -- Nanny sub-pillars
    spg.child_hygiene_safety,
    spg.routine_management,
    spg.behavior_management,
    spg.potty_training,
    spg.first_aid,
    spg.receives_correction,
    spg.nanny_communication,
    spg.emotional_control,
    spg.boundaries_ethics,
    spg.reliability,
    spg.child_room_hygiene,
    spg.toy_sanitation,
    spg.bathroom_cleanliness,
    spg.daily_reset,
    spg.laundry_care,
    spg.child_safe_food_prep,
    spg.age_appropriate_meals,
    spg.food_allergy_awareness,
    spg.kitchen_hygiene_storage,
    spg.family_food_prep
FROM niche_subpillar_grades spg
JOIN trainee_grades tg ON spg.grade_id = tg.id
JOIN niche_training nt ON tg.trainee_id = nt.id
JOIN niche_cohorts nc ON tg.cohort_id = nc.id
WHERE nc.cohort_number = 3
ORDER BY nt.name;