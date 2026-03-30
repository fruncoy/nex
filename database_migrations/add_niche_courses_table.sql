-- Create niche_courses table
CREATE TABLE IF NOT EXISTS niche_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_weeks INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined courses
INSERT INTO niche_courses (name, description, duration_weeks) VALUES
('Professional House Manager Training Program', 'Comprehensive training for professional house management skills', 8),
('Professional Nanny Training Program', 'Complete nanny training covering childcare fundamentals and advanced techniques', 12),
('First Aid & Emergency Response', 'Essential first aid and emergency response training for domestic staff', 2),
('First Foods Done Right: Weaning and Baby Nutrition', 'Specialized training on baby weaning and nutrition for infants and toddlers', 4),
('Laundry & Housekeeping Essentials', 'Professional laundry care and housekeeping standards training', 3),
('Specialised Childcare Support Series', 'Advanced childcare techniques for children with special needs', 6),
('Helping Little Voices Grow: Speech Support at Home', 'Training on supporting child speech development in home environment', 4),
('Kitchen Confidence: Foundation & Intermediate Training', 'Cooking skills from basic to intermediate level for domestic staff', 8);

-- Enable RLS
ALTER TABLE niche_courses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read courses
CREATE POLICY "Allow authenticated users to read courses" ON niche_courses
  FOR SELECT TO authenticated USING (true);

-- Create policy for authenticated users to manage courses (admin only)
CREATE POLICY "Allow authenticated users to manage courses" ON niche_courses
  FOR ALL TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_niche_courses_active ON niche_courses(is_active);
CREATE INDEX idx_niche_courses_name ON niche_courses(name);