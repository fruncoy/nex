-- STEP 1: Check if RLS policies exist on newstaff_contributions
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'newstaff_contributions';

-- STEP 2: Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'newstaff_contributions';

-- STEP 3: Drop and recreate all policies cleanly
DROP POLICY IF EXISTS "Users can view all newstaff contributions" ON newstaff_contributions;
DROP POLICY IF EXISTS "Users can insert newstaff contributions" ON newstaff_contributions;
DROP POLICY IF EXISTS "Users can update newstaff contributions" ON newstaff_contributions;
DROP POLICY IF EXISTS "Users can delete newstaff contributions" ON newstaff_contributions;

-- STEP 4: Recreate with explicit authenticated role
CREATE POLICY "Users can view all newstaff contributions"
  ON newstaff_contributions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert newstaff contributions"
  ON newstaff_contributions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update newstaff contributions"
  ON newstaff_contributions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete newstaff contributions"
  ON newstaff_contributions FOR DELETE
  TO authenticated
  USING (true);

-- STEP 5: Make sure RLS is enabled
ALTER TABLE newstaff_contributions ENABLE ROW LEVEL SECURITY;

-- STEP 6: Test insert manually (replace the staff_id with a real one from your newstaff_members table)
-- SELECT id, name FROM newstaff_members LIMIT 5;
-- INSERT INTO newstaff_contributions (staff_id, contribution_type, description, points, date_of_contribution, created_by)
-- VALUES ('<paste-a-real-staff-id-here>', 'Referral', 'Referral', 10, CURRENT_DATE, 'test');
