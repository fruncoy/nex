-- Drop existing trainee_grades table and create new one for NICHE Academy system
DROP TABLE IF EXISTS trainee_grades CASCADE;

-- Create new trainee_grades table for NICHE Academy Grading System
CREATE TABLE trainee_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainee_id UUID NOT NULL REFERENCES niche_training(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES niche_cohorts(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL CHECK (training_type IN ('nanny', 'house_manager')),
  
  -- Raw pillar scores (sum of 5 criteria each, max 25 per pillar)
  pillar1_score INTEGER CHECK (pillar1_score >= 5 AND pillar1_score <= 25),
  pillar2_score INTEGER CHECK (pillar2_score >= 5 AND pillar2_score <= 25),
  pillar3_score INTEGER CHECK (pillar3_score >= 5 AND pillar3_score <= 25),
  pillar4_score INTEGER CHECK (pillar4_score >= 5 AND pillar4_score <= 25),
  
  -- Weighted pillar scores
  pillar1_weighted DECIMAL(5,2),
  pillar2_weighted DECIMAL(5,2),
  pillar3_weighted DECIMAL(5,2),
  pillar4_weighted DECIMAL(5,2),
  
  -- Final results
  final_score DECIMAL(5,2),
  tier TEXT CHECK (tier IN ('MASTER', 'DISTINGUISHED', 'EXCEPTIONAL', 'EXCELLENT', 'NONE')),
  
  -- Additional fields
  notes TEXT,
  graded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate grading - only one grade per trainee
  UNIQUE(trainee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainee_grades_trainee_id ON trainee_grades(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_cohort_id ON trainee_grades(cohort_id);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_training_type ON trainee_grades(training_type);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_tier ON trainee_grades(tier);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_final_score ON trainee_grades(final_score);

-- Enable RLS
ALTER TABLE trainee_grades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all grades" ON trainee_grades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert grades" ON trainee_grades
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update grades" ON trainee_grades
  FOR UPDATE TO authenticated USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_trainee_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trainee_grades_updated_at
  BEFORE UPDATE ON trainee_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_trainee_grades_updated_at();

-- Create function to calculate weighted scores and tier
CREATE OR REPLACE FUNCTION calculate_academy_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate weighted scores based on training type
  IF NEW.training_type = 'nanny' THEN
    -- Nanny Training: Childcare(1.8), Professional(1.2), Housekeeping(0.6), Cooking(0.4)
    NEW.pillar1_weighted = NEW.pillar1_score * 1.8;
    NEW.pillar2_weighted = NEW.pillar2_score * 1.2;
    NEW.pillar3_weighted = NEW.pillar3_score * 0.6;
    NEW.pillar4_weighted = NEW.pillar4_score * 0.4;
  ELSIF NEW.training_type = 'house_manager' THEN
    -- House Manager: Professional(1.2), Housekeeping(1.2), Cooking(1.0), Childcare(0.6)
    NEW.pillar1_weighted = NEW.pillar1_score * 1.2;
    NEW.pillar2_weighted = NEW.pillar2_score * 1.2;
    NEW.pillar3_weighted = NEW.pillar3_score * 1.0;
    NEW.pillar4_weighted = NEW.pillar4_score * 0.6;
  END IF;
  
  -- Calculate final score
  NEW.final_score = NEW.pillar1_weighted + NEW.pillar2_weighted + NEW.pillar3_weighted + NEW.pillar4_weighted;
  
  -- Assign tier based on final score
  NEW.tier = CASE
    WHEN NEW.final_score >= 95 THEN 'MASTER'
    WHEN NEW.final_score >= 90 THEN 'DISTINGUISHED'
    WHEN NEW.final_score >= 80 THEN 'EXCEPTIONAL'
    WHEN NEW.final_score >= 70 THEN 'EXCELLENT'
    ELSE 'NONE'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic score calculation
CREATE TRIGGER calculate_academy_scores_trigger
  BEFORE INSERT OR UPDATE ON trainee_grades
  FOR EACH ROW
  EXECUTE FUNCTION calculate_academy_scores();