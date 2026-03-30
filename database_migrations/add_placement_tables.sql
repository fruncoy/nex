-- Add placement fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS placement_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS placement_status VARCHAR(50) DEFAULT 'Active';

-- Create client_placements table for tracking replacements
CREATE TABLE IF NOT EXISTS client_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_name VARCHAR(255) NOT NULL,
  placement_order INTEGER NOT NULL DEFAULT 1,
  outcome VARCHAR(50) DEFAULT 'Active',
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_placements_client_id ON client_placements(client_id);
CREATE INDEX IF NOT EXISTS idx_client_placements_candidate_id ON client_placements(candidate_id);

-- Enable RLS
ALTER TABLE client_placements ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage client placements" ON client_placements
  FOR ALL USING (auth.role() = 'authenticated');