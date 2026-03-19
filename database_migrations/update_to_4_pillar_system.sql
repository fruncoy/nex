-- Update NICHE Assessment Questions to 4 Pillars System
-- Delete existing assessment data for Day 3, 5, 10 (keep only Day 1)
DELETE FROM niche_progress_assessments WHERE assessment_day IN (3, 5, 10);

-- Clear existing questions
DELETE FROM niche_assessment_questions;

-- Insert new 4-pillar questions for all assessment days
INSERT INTO niche_assessment_questions (assessment_day, question_number, question_text, pillar_focus) VALUES
-- Day 1 Questions
(1, 1, 'Observe and assess the trainee''s communication, punctuality, attitude, problem-solving, and professional behavior. Rate their overall professionalism.', 'Professional Conduct'),
(1, 2, 'Observe and assess the trainee''s meal planning, preparation techniques, kitchen organization, and food safety practices. Rate their overall cooking competency.', 'Cooking'),
(1, 3, 'Evaluate the trainee''s interaction with children, safety awareness, age-appropriate activities, and child development understanding. Rate their childcare skills.', 'Childcare'),
(1, 4, 'Assess the trainee''s cleaning techniques, organization systems, attention to detail, and efficiency in household management. Rate their housekeeping standards.', 'Housekeeping'),

-- Day 3 Questions (Same as Day 1)
(3, 1, 'Observe and assess the trainee''s communication, punctuality, attitude, problem-solving, and professional behavior. Rate their overall professionalism.', 'Professional Conduct'),
(3, 2, 'Observe and assess the trainee''s meal planning, preparation techniques, kitchen organization, and food safety practices. Rate their overall cooking competency.', 'Cooking'),
(3, 3, 'Evaluate the trainee''s interaction with children, safety awareness, age-appropriate activities, and child development understanding. Rate their childcare skills.', 'Childcare'),
(3, 4, 'Assess the trainee''s cleaning techniques, organization systems, attention to detail, and efficiency in household management. Rate their housekeeping standards.', 'Housekeeping'),

-- Day 5 Questions (Same as Day 1)
(5, 1, 'Observe and assess the trainee''s communication, punctuality, attitude, problem-solving, and professional behavior. Rate their overall professionalism.', 'Professional Conduct'),
(5, 2, 'Observe and assess the trainee''s meal planning, preparation techniques, kitchen organization, and food safety practices. Rate their overall cooking competency.', 'Cooking'),
(5, 3, 'Evaluate the trainee''s interaction with children, safety awareness, age-appropriate activities, and child development understanding. Rate their childcare skills.', 'Childcare'),
(5, 4, 'Assess the trainee''s cleaning techniques, organization systems, attention to detail, and efficiency in household management. Rate their housekeeping standards.', 'Housekeeping'),

-- Day 10 Questions (Same as Day 1)
(10, 1, 'Observe and assess the trainee''s communication, punctuality, attitude, problem-solving, and professional behavior. Rate their overall professionalism.', 'Professional Conduct'),
(10, 2, 'Observe and assess the trainee''s meal planning, preparation techniques, kitchen organization, and food safety practices. Rate their overall cooking competency.', 'Cooking'),
(10, 3, 'Evaluate the trainee''s interaction with children, safety awareness, age-appropriate activities, and child development understanding. Rate their childcare skills.', 'Childcare'),
(10, 4, 'Assess the trainee''s cleaning techniques, organization systems, attention to detail, and efficiency in household management. Rate their housekeeping standards.', 'Housekeeping');