-- Fix RLS policies for niche_training table
-- This addresses the "relation does not exist" error which is actually a permissions issue

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all niche training records" ON niche_training;
DROP POLICY IF EXISTS "Users can insert niche training records" ON niche_training;
DROP POLICY IF EXISTS "Users can update niche training records" ON niche_training;
DROP POLICY IF EXISTS "Public can read training for verification" ON niche_training;

-- Recreate policies with proper auth checks
CREATE POLICY "Enable read access for authenticated users"
  ON niche_training FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON niche_training FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON niche_training FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON niche_training FOR DELETE
  TO authenticated
  USING (true);

-- Also add a policy for public certificate verification (if needed)
CREATE POLICY "Public can view records with certificate tokens"
  ON niche_training FOR SELECT
  TO anon
  USING (certificate_token IS NOT NULL);

-- Verify the table exists and RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'niche_training';

-- Show all current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'niche_training';
