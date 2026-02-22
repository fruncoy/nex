-- Add refresher course to niche_courses table
INSERT INTO niche_courses (name, description, duration_weeks) VALUES
('Refresher Training', 'Refresher training for existing staff to update skills and knowledge', 1)
ON CONFLICT (name) DO NOTHING;