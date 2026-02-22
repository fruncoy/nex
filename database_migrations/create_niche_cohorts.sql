-- Create niche_cohorts table
CREATE TABLE IF NOT EXISTS niche_cohorts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_number INTEGER NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add cohort_id to niche_training table if it doesn't exist
ALTER TABLE niche_training ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES niche_cohorts(id);

-- Insert sample cohorts for 2026 (only if they don't exist)
INSERT INTO niche_cohorts (cohort_number, start_date, end_date, status) 
SELECT * FROM (
  VALUES 
  (1, '2026-02-02'::date, '2026-02-15'::date, 'completed'),
  (2, '2026-02-16'::date, '2026-03-01'::date, 'active'),
  (3, '2026-03-02'::date, '2026-03-15'::date, 'upcoming'),
  (4, '2026-03-16'::date, '2026-03-29'::date, 'upcoming'),
  (5, '2026-03-30'::date, '2026-04-12'::date, 'upcoming')
) AS v(cohort_number, start_date, end_date, status)
WHERE NOT EXISTS (
  SELECT 1 FROM niche_cohorts WHERE niche_cohorts.cohort_number = v.cohort_number
);

-- Auto-update cohort statuses based on current date
UPDATE niche_cohorts SET status = 
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'completed'
    WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'active'
    ELSE 'upcoming'
  END;

-- Auto-assign trainees to cohorts based on their date_started
UPDATE niche_training 
SET cohort_id = (
  SELECT c.id 
  FROM niche_cohorts c 
  WHERE niche_training.date_started >= c.start_date 
    AND niche_training.date_started <= c.end_date
  LIMIT 1
)
WHERE date_started IS NOT NULL AND cohort_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_niche_cohorts_status ON niche_cohorts(status);
CREATE INDEX IF NOT EXISTS idx_niche_cohorts_number ON niche_cohorts(cohort_number);
CREATE INDEX IF NOT EXISTS idx_niche_training_cohort_id ON niche_training(cohort_id);

-- Enable RLS
ALTER TABLE niche_cohorts ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'niche_cohorts' AND policyname = 'Allow authenticated users to read cohorts') THEN
    CREATE POLICY "Allow authenticated users to read cohorts" ON niche_cohorts
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'niche_cohorts' AND policyname = 'Allow authenticated users to manage cohorts') THEN
    CREATE POLICY "Allow authenticated users to manage cohorts" ON niche_cohorts
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_niche_cohorts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS niche_cohorts_updated_at ON niche_cohorts;
CREATE TRIGGER niche_cohorts_updated_at
  BEFORE UPDATE ON niche_cohorts
  FOR EACH ROW
  EXECUTE FUNCTION update_niche_cohorts_updated_at();