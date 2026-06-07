-- Update existing courses and insert new ones based on the March 2026 schedule

-- Marinating & Grilling Class
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Marinating & Grilling Class', 2500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2500, is_active = true;

-- Home Baking & Pastry Foundations Class
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Home Baking & Pastry Foundations Class', 2500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2500, is_active = true;

-- Creamy Alfredo, Lemon Butter Fish & Asian Stir Fry Class
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Creamy Alfredo, Lemon Butter Fish & Asian Stir Fry Class', 2500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2500, is_active = true;

-- Housekeeping & Bedmaking
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Housekeeping & Bedmaking', 2000, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2000, is_active = true;

-- Etiquette & Communication
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Etiquette & Communication', 1500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 1500, is_active = true;

-- Pet Care
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Pet Care', 1500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 1500, is_active = true;

-- Infant & Toddler Care
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Infant & Toddler Care', 2500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2500, is_active = true;

-- Work Planning & Home Management
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Work Planning & Home Management', 1500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 1500, is_active = true;

-- Intro to basic first aid
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Intro to basic first aid', 1500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 1500, is_active = true;

-- Housekeeping & Laundry
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Housekeeping & Laundry', 2000, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2000, is_active = true;

-- Special Needs
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Special Needs', 2000, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2000, is_active = true;

-- Weaning
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Weaning', 2000, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 2000, is_active = true;

-- Inventory management & forecasting
INSERT INTO niche_courses (name, cost_kes, course_type, is_active)
VALUES ('Inventory management & forecasting', 1500, 'specialized', true)
ON CONFLICT (name) DO UPDATE SET cost_kes = 1500, is_active = true;
