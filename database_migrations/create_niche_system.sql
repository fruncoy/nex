-- Create NICHE-focused system tables
-- Migration: Create NICHE Candidates and Interviews tables

-- NICHE Candidates table (based on candidates structure but NICHE-focused)
CREATE TABLE IF NOT EXISTS niche_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  source text,
  role text,
  inquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'Pending' CHECK (status IN (
    'Pending', 
    'Interview Scheduled', 
    'Lost - No Show Interview',
    'Lost - Failed Interview', 
    'Lost - Age',
    'Lost - No References',
    'Lost - No Response',
    'Lost - Other',
    'BLACKLISTED',
    'Graduated',
    'Active in Training'
  )),
  scheduled_date timestamptz,
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  added_by text,
  
  -- Extended fields from current candidates table
  live_arrangement text,
  work_schedule text,
  employment_type text,
  expected_salary numeric,
  age integer,
  place_of_birth text,
  next_of_kin_1_phone text,
  next_of_kin_1_name text,
  next_of_kin_1_location text,
  next_of_kin_2_phone text,
  next_of_kin_2_name text,
  next_of_kin_2_location text,
  referee_1_phone text,
  referee_1_name text,
  referee_2_phone text,
  referee_2_name text,
  address text,
  apartment text,
  total_years_experience integer,
  has_good_conduct_cert boolean,
  good_conduct_cert_receipt text,
  good_conduct_status text,
  work_experiences text,
  kenya_years integer,
  qualification_score integer,
  qualification_notes text,
  preferred_interview_date text,
  id_number text,
  email text,
  county text,
  town text,
  estate text,
  marital_status text,
  has_kids boolean,
  kids_count integer,
  has_parents text,
  off_day text,
  has_siblings boolean,
  dependent_siblings integer,
  education_level text
);

-- NICHE Interviews table (linked to niche_candidates)
CREATE TABLE IF NOT EXISTS niche_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_candidate_id uuid REFERENCES niche_candidates(id) ON DELETE CASCADE,
  date_time timestamptz NOT NULL,
  location text DEFAULT 'Office',
  assigned_staff uuid,
  attended boolean DEFAULT false,
  outcome text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- NICHE Candidate Notes table
CREATE TABLE IF NOT EXISTS niche_candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_candidate_id uuid REFERENCES niche_candidates(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_by jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_niche_candidates_phone ON niche_candidates(phone);
CREATE INDEX IF NOT EXISTS idx_niche_candidates_status ON niche_candidates(status);
CREATE INDEX IF NOT EXISTS idx_niche_candidates_inquiry_date ON niche_candidates(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_niche_candidates_source ON niche_candidates(source);
CREATE INDEX IF NOT EXISTS idx_niche_interviews_candidate_id ON niche_interviews(niche_candidate_id);
CREATE INDEX IF NOT EXISTS idx_niche_interviews_date_time ON niche_interviews(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_niche_candidate_notes_candidate_id ON niche_candidate_notes(niche_candidate_id);

-- Enable Row Level Security
ALTER TABLE niche_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_candidate_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all niche candidates"
  ON niche_candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert niche candidates"
  ON niche_candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update niche candidates"
  ON niche_candidates FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all niche interviews"
  ON niche_interviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert niche interviews"
  ON niche_interviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update niche interviews"
  ON niche_interviews FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all niche candidate notes"
  ON niche_candidate_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert niche candidate notes"
  ON niche_candidate_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update niche candidate notes"
  ON niche_candidate_notes FOR UPDATE
  TO authenticated
  USING (true);