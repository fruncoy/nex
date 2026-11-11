-- The issue is that INSERT with column specification fails but SELECT works
-- This indicates the RLS policy USING clause is different from WITH CHECK clause
-- Or there's a grant missing for INSERT specifically

-- Step 1: Check current grants
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'niche_training'
ORDER BY grantee, privilege_type;

-- Step 2: Explicitly grant INSERT permission to authenticated role
GRANT INSERT ON niche_training TO authenticated;
GRANT SELECT ON niche_training TO authenticated;
GRANT UPDATE ON niche_training TO authenticated;
GRANT DELETE ON niche_training TO authenticated;

-- Step 3: Also grant to anon (for good measure, though shouldn't be needed)
GRANT SELECT ON niche_training TO anon;

-- Step 4: Verify RLS policies are still active
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'niche_training';

-- Step 5: Show current policies
SELECT 
    policyname,
    roles,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'niche_training';

-- Step 6: Reload schema
NOTIFY pgrst, 'reload schema';
