-- Create NICHE training table
CREATE TABLE IF NOT EXISTS niche_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  role text,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Suspended', 'Expelled')),
  course text,
  description text,
  date_started date,
  date_completed date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_niche_training_candidate_id ON niche_training(candidate_id);
CREATE INDEX IF NOT EXISTS idx_niche_training_status ON niche_training(status);
CREATE INDEX IF NOT EXISTS idx_niche_training_course ON niche_training(course);
CREATE INDEX IF NOT EXISTS idx_niche_training_created_at ON niche_training(created_at DESC);

-- Enable RLS
ALTER TABLE niche_training ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all niche training records"
  ON niche_training FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert niche training records"
  ON niche_training FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update niche training records"
  ON niche_training FOR UPDATE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_niche_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER niche_training_updated_at
  BEFORE UPDATE ON niche_training
  FOR EACH ROW
  EXECUTE FUNCTION update_niche_training_updated_at();