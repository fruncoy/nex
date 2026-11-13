-- FIX: Restore short course participants who were wrongly marked as Expelled
-- These should have "Completed" status, not "Expelled"

BEGIN;

-- First, check what training_type these people have
SELECT 
  'Current training_type of expelled' as info,
  nt.name,
  nt.training_type,
  nt.status,
  nc.cohort_number
FROM niche_training nt
LEFT JOIN niche_cohorts nc ON nt.cohort_id = nc.id
WHERE nt.status = 'Expelled'
ORDER BY nc.cohort_number;

-- The short course participants should be marked as "Completed" not "Expelled"
-- Based on the list you showed, these are short courses:
-- Sarafina Kamau (cohort 1)
-- Brenda Mukite (cohort 2)
-- Caroline Atieno (cohort 2)
-- Elizabeth Kioko (cohort 2)
-- Mercy Kyule (cohort 2)
-- Violet Midecha Kimiya (cohort 2)
-- Joy Orucosson (cohort 9)
-- Rista Bousii (cohort 9)
-- Beatrice Chebet Langat (cohort 11)
-- Caroline Lioha Muchilwa (cohort 16)
-- Wikister Akinyi Odongo (cohort 16)
-- Gladys Awino (cohort 17) - ACTUAL EXPELLED
-- Naomi Kemunto (cohort 17) - ACTUAL EXPELLED
-- Sarah Namarome (cohort 17) - SHORT COURSE
-- Teresia Gachambi Mwangi (cohort 17) - SHORT COURSE

-- Update short courses back to "Completed"
-- I need to know: How do we identify short courses? 
-- Is there a training_type field? Or specific cohorts?

-- For now, let me check if training_type is set
SELECT 
  'Training type check' as info,
  nt.name,
  nt.training_type,
  nt.status
FROM niche_training nt
WHERE nt.status = 'Expelled'
ORDER BY nt.name;

ROLLBACK; -- Change to COMMIT when ready
