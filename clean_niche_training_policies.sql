-- Clean up and simplify niche_training RLS policies
-- This removes redundant and potentially conflicting policies

-- Drop ALL existing policies
DROP POLICY IF EXISTS "authenticated read" ON niche_training;
DROP POLICY IF EXISTS "Staff can manage niche training" ON niche_training;
DROP POLICY IF EXISTS "Authenticated users can insert training records" ON niche_training;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON niche_training;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON niche_training;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON niche_training;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON niche_training;
DROP POLICY IF EXISTS "Public can view records with certificate tokens" ON niche_training;
DROP POLICY IF EXISTS "Users can view all niche training records" ON niche_training;
DROP POLICY IF EXISTS "Users can insert niche training records" ON niche_training;
DROP POLICY IF EXISTS "Users can update niche training records" ON niche_training;

-- Create a single comprehensive policy for authenticated users
-- This is simpler and avoids conflicts
CREATE POLICY "Authenticated users have full access"
  ON niche_training
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep the public certificate verification policy
CREATE POLICY "Public can view certificates"
  ON niche_training
  FOR SELECT
  TO anon
  USING (certificate_token IS NOT NULL);

-- Verify the cleanup
SELECT 
    policyname,
    roles,
    cmd,
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'niche_training'
ORDER BY policyname;
