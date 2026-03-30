-- Fix candidate_notes table schema to match expected structure

-- Drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS candidate_notes CASCADE;

-- Recreate candidate_notes table with correct schema
CREATE TABLE candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_by JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX candidate_notes_candidate_id_idx ON candidate_notes(candidate_id);
CREATE INDEX candidate_notes_created_at_idx ON candidate_notes(created_at);

-- Enable RLS
ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to read candidate notes" ON candidate_notes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert candidate notes" ON candidate_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update candidate notes" ON candidate_notes
  FOR UPDATE USING (auth.role() = 'authenticated');