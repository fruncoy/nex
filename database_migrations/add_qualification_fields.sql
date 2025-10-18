-- Add qualification and work experience fields to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS good_conduct_status TEXT,
ADD COLUMN IF NOT EXISTS work_experiences JSONB,
ADD COLUMN IF NOT EXISTS kenya_years INTEGER,
ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qualification_notes TEXT;

-- Update existing candidates with default values
UPDATE candidates 
SET 
  qualification_score = 0,
  kenya_years = 0
WHERE qualification_score IS NULL OR kenya_years IS NULL;