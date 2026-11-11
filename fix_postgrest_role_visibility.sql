-- PostgREST uses different roles for different operations
-- The issue might be that the 'authenticator' or 'anon' role can SELECT but not INSERT

-- Step 1: Check what roles exist
SELECT rolname FROM pg_roles WHERE rolname IN ('authenticator', 'anon', 'authenticated', 'postgres', 'postgrest');

-- Step 2: Grant USAGE on public schema to all API roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticator;

-- Step 3: Grant ALL privileges on niche_training to all API roles
GRANT ALL PRIVILEGES ON niche_training TO anon;
GRANT ALL PRIVILEGES ON niche_training TO authenticated;
GRANT ALL PRIVILEGES ON niche_training TO authenticator;

-- Step 4: Grant sequence permissions (for UUID generation if needed)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 5: Make sure the table owner allows access
ALTER TABLE niche_training OWNER TO postgres;

-- Step 6: Re-grant everything after owner change
GRANT ALL ON niche_training TO authenticated;
GRANT ALL ON niche_training TO anon;

-- Step 7: Explicitly allow INSERT on the table
ALTER TABLE niche_training ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the INSERT policy to be absolutely sure
DROP POLICY IF EXISTS "Authenticated users have full access" ON niche_training;

CREATE POLICY "Authenticated users have full access"
  ON niche_training
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also create a separate INSERT-specific policy
DROP POLICY IF EXISTS "Authenticated can insert" ON niche_training;

CREATE POLICY "Authenticated can insert"
  ON niche_training
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 8: Verify policies
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'niche_training';

-- Step 9: Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 10: Show final grants
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'niche_training'
  AND grantee IN ('authenticated', 'anon', 'authenticator')
ORDER BY grantee, privilege_type;
