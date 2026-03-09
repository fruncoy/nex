-- Create trainee_grades table for NICHE Training Grading System
CREATE TABLE IF NOT EXISTS trainee_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainee_id UUID NOT NULL REFERENCES niche_training(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES niche_cohorts(id) ON DELETE CASCADE,
  
  -- Childcare criteria (1-5 each)
  child_hygiene INTEGER CHECK (child_hygiene >= 1 AND child_hygiene <= 5),
  routine_management INTEGER CHECK (routine_management >= 1 AND routine_management <= 5),
  behavior_management INTEGER CHECK (behavior_management >= 1 AND behavior_management <= 5),
  potty_training INTEGER CHECK (potty_training >= 1 AND potty_training <= 5),
  first_aid INTEGER CHECK (first_aid >= 1 AND first_aid <= 5),
  
  -- Professional conduct criteria (1-5 each)
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  time_management INTEGER CHECK (time_management >= 1 AND time_management <= 5),
  respectfulness INTEGER CHECK (respectfulness >= 1 AND respectfulness <= 5),
  responsibility INTEGER CHECK (responsibility >= 1 AND responsibility <= 5),
  attitude INTEGER CHECK (attitude >= 1 AND attitude <= 5),
  
  -- Housekeeping criteria (1-5 each)
  cleaning INTEGER CHECK (cleaning >= 1 AND cleaning <= 5),
  laundry INTEGER CHECK (laundry >= 1 AND laundry <= 5),
  organization INTEGER CHECK (organization >= 1 AND organization <= 5),
  dishwashing INTEGER CHECK (dishwashing >= 1 AND dishwashing <= 5),
  tidiness INTEGER CHECK (tidiness >= 1 AND tidiness <= 5),
  
  -- Cooking criteria (1-5 each)
  food_safety INTEGER CHECK (food_safety >= 1 AND food_safety <= 5),
  meal_preparation INTEGER CHECK (meal_preparation >= 1 AND meal_preparation <= 5),
  nutrition_awareness INTEGER CHECK (nutrition_awareness >= 1 AND nutrition_awareness <= 5),
  kitchen_hygiene INTEGER CHECK (kitchen_hygiene >= 1 AND kitchen_hygiene <= 5),
  efficiency INTEGER CHECK (efficiency >= 1 AND efficiency <= 5),
  
  -- Calculated scores
  childcare_score DECIMAL(5,2),
  conduct_score DECIMAL(5,2),
  housekeeping_score DECIMAL(5,2),
  cooking_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  grade_label TEXT CHECK (grade_label IN ('Excellent', 'Good', 'Pass', 'Fail')),
  
  -- Additional fields
  notes TEXT,
  graded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate grading
  UNIQUE(trainee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainee_grades_trainee_id ON trainee_grades(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_cohort_id ON trainee_grades(cohort_id);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_grade_label ON trainee_grades(grade_label);
CREATE INDEX IF NOT EXISTS idx_trainee_grades_total_score ON trainee_grades(total_score);

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

-- Create function to calculate scores automatically
CREATE OR REPLACE FUNCTION calculate_grade_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate category scores using weighted formula
  NEW.childcare_score = ROUND(
    ((COALESCE(NEW.child_hygiene, 0) + COALESCE(NEW.routine_management, 0) + 
      COALESCE(NEW.behavior_management, 0) + COALESCE(NEW.potty_training, 0) + 
      COALESCE(NEW.first_aid, 0)) / 5.0 / 5.0) * 45, 2
  );
  
  NEW.conduct_score = ROUND(
    ((COALESCE(NEW.communication, 0) + COALESCE(NEW.time_management, 0) + 
      COALESCE(NEW.respectfulness, 0) + COALESCE(NEW.responsibility, 0) + 
      COALESCE(NEW.attitude, 0)) / 5.0 / 5.0) * 30, 2
  );
  
  NEW.housekeeping_score = ROUND(
    ((COALESCE(NEW.cleaning, 0) + COALESCE(NEW.laundry, 0) + 
      COALESCE(NEW.organization, 0) + COALESCE(NEW.dishwashing, 0) + 
      COALESCE(NEW.tidiness, 0)) / 5.0 / 5.0) * 15, 2
  );
  
  NEW.cooking_score = ROUND(
    ((COALESCE(NEW.food_safety, 0) + COALESCE(NEW.meal_preparation, 0) + 
      COALESCE(NEW.nutrition_awareness, 0) + COALESCE(NEW.kitchen_hygiene, 0) + 
      COALESCE(NEW.efficiency, 0)) / 5.0 / 5.0) * 10, 2
  );
  
  -- Calculate total score
  NEW.total_score = NEW.childcare_score + NEW.conduct_score + NEW.housekeeping_score + NEW.cooking_score;
  
  -- Assign grade label
  NEW.grade_label = CASE
    WHEN NEW.total_score >= 90 THEN 'Excellent'
    WHEN NEW.total_score >= 75 THEN 'Good'
    WHEN NEW.total_score >= 60 THEN 'Pass'
    ELSE 'Fail'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic score calculation
CREATE TRIGGER calculate_scores_trigger
  BEFORE INSERT OR UPDATE ON trainee_grades
  FOR EACH ROW
  EXECUTE FUNCTION calculate_grade_scores();