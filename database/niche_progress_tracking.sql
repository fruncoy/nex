-- NICHE Internal Progress Tracking Database Schema

-- Table for progress assessments
CREATE TABLE niche_progress_assessments (
  id SERIAL PRIMARY KEY,
  trainee_id UUID REFERENCES niche_training(id) ON DELETE CASCADE,
  assessment_day INTEGER NOT NULL CHECK (assessment_day IN (1, 3, 5, 10)),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Day-specific questions (1-5 scale)
  question_1_score INTEGER CHECK (question_1_score >= 1 AND question_1_score <= 5),
  question_2_score INTEGER CHECK (question_2_score >= 1 AND question_2_score <= 5),
  question_3_score INTEGER CHECK (question_3_score >= 1 AND question_3_score <= 5),
  question_4_score INTEGER CHECK (question_4_score >= 1 AND question_4_score <= 5),
  question_5_score INTEGER CHECK (question_5_score >= 1 AND question_5_score <= 5),
  
  -- Overall assessment
  total_score DECIMAL(3,1) GENERATED ALWAYS AS (
    (question_1_score + question_2_score + question_3_score + question_4_score + question_5_score) / 5.0
  ) STORED,
  
  -- Notes and observations
  instructor_notes TEXT,
  red_flags TEXT,
  improvement_areas TEXT,
  
  -- Recommendation
  recommendation VARCHAR(50) CHECK (recommendation IN ('Continue', 'Monitor Closely', 'Intervention Required', 'Consider Dismissal')),
  
  -- Metadata
  assessed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one assessment per trainee per day
  UNIQUE(trainee_id, assessment_day)
);

-- Table for assessment questions (reference data)
CREATE TABLE niche_assessment_questions (
  id SERIAL PRIMARY KEY,
  assessment_day INTEGER NOT NULL CHECK (assessment_day IN (1, 3, 5, 10)),
  question_number INTEGER NOT NULL CHECK (question_number >= 1 AND question_number <= 5),
  question_text TEXT NOT NULL,
  pillar_focus VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(assessment_day, question_number)
);

-- Insert assessment questions
INSERT INTO niche_assessment_questions (assessment_day, question_number, question_text, pillar_focus) VALUES
-- Day 1 - Foundation Check (Monday)
(1, 1, 'Shows basic understanding of child safety principles', 'Safety & First Aid'),
(1, 2, 'Demonstrates respectful communication with instructors', 'Communication & Interpersonal'),
(1, 3, 'Follows basic hygiene practices during activities', 'Home Standards & Housekeeping'),
(1, 4, 'Shows willingness to learn and ask questions', 'Attitude & Emotional Management'),
(1, 5, 'Arrives on time and prepared', 'Professionalism & Integrity'),

-- Day 3 - Early Progress (Wednesday)
(3, 1, 'Applies childcare concepts from Day 1-2 lessons', 'Childcare & Development'),
(3, 2, 'Shows improvement in practical demonstrations', 'Attitude & Emotional Management'),
(3, 3, 'Maintains clean workspace during cooking/cleaning tasks', 'Home Standards & Housekeeping'),
(3, 4, 'Accepts feedback positively and makes adjustments', 'Communication & Interpersonal'),
(3, 5, 'Participates actively in group discussions', 'Professionalism & Integrity'),

-- Day 5 - Mid-Point Assessment (Friday)
(5, 1, 'Demonstrates age-appropriate activity planning', 'Childcare & Development'),
(5, 2, 'Shows consistency in professional behavior', 'Professionalism & Integrity'),
(5, 3, 'Executes basic household tasks to standard', 'Home Standards & Housekeeping'),
(5, 4, 'Communicates clearly about child needs/concerns', 'Communication & Interpersonal'),
(5, 5, 'Shows initiative in learning beyond minimum requirements', 'Attitude & Emotional Management'),

-- Day 10 - Pre-Graduation Readiness (Wednesday)
(10, 1, 'Confidently handles childcare scenarios independently', 'Childcare & Development'),
(10, 2, 'Maintains professional standards under pressure', 'Professionalism & Integrity'),
(10, 3, 'Completes all household tasks efficiently and safely', 'Home Standards & Housekeeping'),
(10, 4, 'Communicates effectively with parents/supervisors', 'Communication & Interpersonal'),
(10, 5, 'Demonstrates readiness for real-world placement', 'Overall Readiness');

-- Enable Row Level Security
ALTER TABLE niche_progress_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_assessment_questions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for all users" ON niche_progress_assessments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON niche_progress_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON niche_progress_assessments FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON niche_assessment_questions FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_progress_trainee_day ON niche_progress_assessments(trainee_id, assessment_day);
CREATE INDEX idx_progress_date ON niche_progress_assessments(assessment_date);
CREATE INDEX idx_progress_recommendation ON niche_progress_assessments(recommendation);