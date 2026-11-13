-- SQL script to clean up inflated scores in the database
-- Run this in your Supabase SQL editor

-- First, let's see what's in the trainee_grades table
SELECT * FROM trainee_grades WHERE final_score > 100 OR pillar1_score > 100 OR pillar2_score > 100 OR pillar3_score > 100 OR pillar4_score > 100;

-- Delete any records with inflated scores (scores over 100)
DELETE FROM trainee_grades WHERE final_score > 100 OR pillar1_score > 100 OR pillar2_score > 100 OR pillar3_score > 100 OR pillar4_score > 100;

-- Clean up orphaned sub-pillar grades (grades that don't have a corresponding main grade)
DELETE FROM niche_subpillar_grades 
WHERE grade_id NOT IN (SELECT id FROM trainee_grades);

-- Check what remains
SELECT COUNT(*) as remaining_grades FROM trainee_grades;
SELECT COUNT(*) as remaining_subpillar_grades FROM niche_subpillar_grades;