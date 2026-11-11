-- Diagnose why PostgREST can't see niche_training for INSERT
-- Error 42P01 means "relation does not exist" which suggests schema visibility issue

-- 1. Check which schema the table is in
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'niche_training';

-- 2. Check if table is in the public schema
SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'niche_training'
) as table_in_public_schema;

-- 3. Check table owner
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'niche_training';

-- 4. Check ALL grants on the table
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'niche_training'
ORDER BY grantee, privilege_type;

-- 5. Check if there's a search_path issue
SHOW search_path;

-- 6. Check PostgREST's schema cache
SELECT 
    n.nspname as schema,
    c.relname as table_name,
    c.relkind as type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'niche_training';

-- 7. Try to force table ownership to postgres
-- (Comment out if you don't want to change ownership)
-- ALTER TABLE niche_training OWNER TO postgres;

-- 8. Grant to ALL roles just to test
GRANT ALL ON niche_training TO authenticated;
GRANT ALL ON niche_training TO anon;
GRANT ALL ON niche_training TO postgres;
GRANT ALL ON niche_training TO public;

-- 9. Check if RLS is blocking with specific INSERT test
SET ROLE authenticated;
SELECT current_user, session_user;

-- Try a test insert as authenticated role
DO $$
BEGIN
    INSERT INTO niche_training (name, status, created_by, updated_by)
    VALUES ('Test', 'Active', 'Test', 'Test');
    RAISE NOTICE 'INSERT worked!';
    ROLLBACK;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INSERT failed: %', SQLERRM;
END $$;

RESET ROLE;

-- 10. Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

-- 11. Check if there are multiple tables with same name in different schemas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename LIKE '%training%'
ORDER BY schemaname, tablename;
