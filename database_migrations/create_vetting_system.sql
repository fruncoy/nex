-- Create vetting system tables

-- Add vetting fields to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS certifications TEXT[],
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS ages_experienced TEXT[];

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id),
  interview_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'locked')),
  overall_percentage DECIMAL(5,2),
  aggregate_score DECIMAL(3,2),
  onboard_recommendation BOOLEAN,
  onboard_reason TEXT,
  key_strength TEXT,
  next_strength TEXT,
  development_needed TEXT,
  narrative TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pillars table
CREATE TABLE IF NOT EXISTS pillars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pillar_weight DECIMAL(4,3) NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create criteria table
CREATE TABLE IF NOT EXISTS criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  how_to_assess TEXT NOT NULL,
  interviewer_question TEXT NOT NULL,
  criterion_weight DECIMAL(4,3) NOT NULL,
  is_critical BOOLEAN DEFAULT FALSE,
  guidance_1 TEXT DEFAULT 'Needs Training',
  guidance_2 TEXT DEFAULT 'Emerging',
  guidance_3 TEXT DEFAULT 'Meets Standard',
  guidance_4 TEXT DEFAULT 'Strong',
  guidance_5 TEXT DEFAULT 'Excellent',
  red_flag_hints TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score INTEGER CHECK (score BETWEEN 1 AND 5 OR score IS NULL),
  notes TEXT,
  red_flags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assessment_id, criterion_id)
);

-- Create pillar_scores view
CREATE OR REPLACE VIEW pillar_scores AS
SELECT 
  a.id as assessment_id,
  p.id as pillar_id,
  p.name as pillar_name,
  p.pillar_weight,
  COALESCE(
    ROUND(
      SUM(
        CASE 
          WHEN r.score IS NOT NULL THEN (r.score::DECIMAL / 5.0) * c.criterion_weight
          ELSE 0
        END
      ) / NULLIF(
        SUM(
          CASE 
            WHEN r.score IS NOT NULL THEN c.criterion_weight
            ELSE 0
          END
        ), 0
      ) * 100, 2
    ), 0
  ) as pillar_percentage,
  COUNT(CASE WHEN r.score IS NOT NULL THEN 1 END) as scored_criteria,
  COUNT(c.id) as total_criteria,
  BOOL_OR(c.is_critical AND r.score <= 2) as has_critical_failure
FROM assessments a
CROSS JOIN pillars p
LEFT JOIN criteria c ON c.pillar_id = p.id
LEFT JOIN responses r ON r.assessment_id = a.id AND r.criterion_id = c.id
GROUP BY a.id, p.id, p.name, p.pillar_weight;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_assessments_candidate_id ON assessments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_criteria_pillar_id ON criteria(pillar_id);
CREATE INDEX IF NOT EXISTS idx_responses_assessment_id ON responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_responses_criterion_id ON responses(criterion_id);

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to manage assessments" ON assessments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read pillars" ON pillars
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read criteria" ON criteria
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage responses" ON responses
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed initial pillars
INSERT INTO pillars (name, pillar_weight, display_order) VALUES
('Childcare & Development', 0.22, 1),
('Safety & First Aid', 0.18, 2),
('Cooking & Nutrition', 0.14, 3),
('Home Standards & Housekeeping', 0.12, 4),
('Laundry & Garment Care', 0.10, 5),
('Communication & Interpersonal', 0.10, 6),
('Professionalism & Integrity', 0.07, 7),
('Attitude & Emotional Management', 0.07, 8)
ON CONFLICT (name) DO NOTHING;

-- Seed initial criteria for Childcare & Development
INSERT INTO criteria (pillar_id, name, why_it_matters, how_to_assess, interviewer_question, criterion_weight, is_critical, red_flag_hints, display_order)
SELECT 
  p.id,
  'Daily routine & structure',
  'Predictable days make children feel safe and calm.',
  'Ask for a simple day plan by age; listen for meals, naps, play, hygiene, quiet time.',
  'Give a simple day plan for a toddler (morning→evening). Include meal times, nap times, active play, quiet time, and hygiene. Say how you adjust if the child is sick or fussy.',
  0.33,
  FALSE,
  '"I just follow the child", TV as schedule, no plan for conflicts',
  1
FROM pillars p WHERE p.name = 'Childcare & Development'
ON CONFLICT DO NOTHING;

INSERT INTO criteria (pillar_id, name, why_it_matters, how_to_assess, interviewer_question, criterion_weight, is_critical, red_flag_hints, display_order)
SELECT 
  p.id,
  'Age-appropriate play & learning',
  'Right activities support development and reduce screen time.',
  'Ask for 3 screen-free activities for a named age and why they help.',
  'Name three screen-free activities for a preschooler and tell me why each helps the child.',
  0.33,
  FALSE,
  'unsafe/age-inappropriate, only screens, poor supervision',
  2
FROM pillars p WHERE p.name = 'Childcare & Development'
ON CONFLICT DO NOTHING;

INSERT INTO criteria (pillar_id, name, why_it_matters, how_to_assess, interviewer_question, criterion_weight, is_critical, red_flag_hints, display_order)
SELECT 
  p.id,
  'Sleep & soothing',
  'Good sleep keeps children healthy; calm routines reduce conflict.',
  'Ask bedtime steps and how to handle night wake-ups.',
  'How would you help a 4-year-old who resists bedtime? Tell me your steps and how you handle wake-ups.',
  0.34,
  TRUE,
  'threats/TV, sedatives without approval, shaming/locking in',
  3
FROM pillars p WHERE p.name = 'Childcare & Development'
ON CONFLICT DO NOTHING;