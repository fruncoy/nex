-- Create candidate_notes table
CREATE TABLE IF NOT EXISTS candidate_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate_id ON candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_created_at ON candidate_notes(created_at);

-- Add RLS policies
ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read all notes
CREATE POLICY "Allow authenticated users to read candidate notes" ON candidate_notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert notes
CREATE POLICY "Allow authenticated users to insert candidate notes" ON candidate_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add additional fields to candidates table for blacklisted details
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS place_of_stay TEXT,
ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;