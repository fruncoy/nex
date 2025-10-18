-- Add new columns to candidates table for enhanced profile
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS town TEXT,
ADD COLUMN IF NOT EXISTS estate TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS has_kids BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kids_count INTEGER,
ADD COLUMN IF NOT EXISTS has_parents TEXT,
ADD COLUMN IF NOT EXISTS off_day TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_1_relationship TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_2_relationship TEXT,
ADD COLUMN IF NOT EXISTS has_siblings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dependent_siblings INTEGER,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS good_conduct_status TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS preferred_interview_date DATE,
ADD COLUMN IF NOT EXISTS lost_reason TEXT,
ADD COLUMN IF NOT EXISTS internal_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kenya_experience_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kenya_experience_years INTEGER DEFAULT 0;

-- Create work_experiences table
CREATE TABLE IF NOT EXISTS work_experiences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    employer_name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Kenya',
    start_date TEXT NOT NULL, -- Format: YYYY-MM
    end_date TEXT, -- Format: YYYY-MM, NULL if still_working
    still_working BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);
CREATE INDEX IF NOT EXISTS idx_candidates_id_number ON candidates(id_number);
CREATE INDEX IF NOT EXISTS idx_candidates_internal_score ON candidates(internal_score);
CREATE INDEX IF NOT EXISTS idx_work_experiences_candidate_id ON work_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_work_experiences_country ON work_experiences(country);

-- Add constraints (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_good_conduct_status') THEN
        ALTER TABLE candidates ADD CONSTRAINT chk_good_conduct_status 
        CHECK (good_conduct_status IN ('Valid Certificate', 'Applied (Receipt)', 'Expired', 'None'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_education_level') THEN
        ALTER TABLE candidates ADD CONSTRAINT chk_education_level 
        CHECK (education_level IN ('Primary', 'Secondary', 'College', 'University'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_marital_status') THEN
        ALTER TABLE candidates ADD CONSTRAINT chk_marital_status 
        CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_has_parents') THEN
        ALTER TABLE candidates ADD CONSTRAINT chk_has_parents 
        CHECK (has_parents IN ('Both Parents', 'Single Parent', 'No Parents'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_off_day') THEN
        ALTER TABLE candidates ADD CONSTRAINT chk_off_day 
        CHECK (off_day IN ('Saturday', 'Sunday'));
    END IF;
END $$;

-- Update trigger for work_experiences
CREATE OR REPLACE FUNCTION update_work_experiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_work_experiences_updated_at ON work_experiences;
CREATE TRIGGER trigger_update_work_experiences_updated_at
    BEFORE UPDATE ON work_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_work_experiences_updated_at();

-- Enable RLS on work_experiences
ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_experiences (allow all operations for authenticated users)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON work_experiences;
CREATE POLICY "Allow all operations for authenticated users" ON work_experiences
    FOR ALL USING (auth.role() = 'authenticated');