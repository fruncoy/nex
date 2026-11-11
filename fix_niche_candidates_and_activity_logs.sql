-- Fix niche_candidates and activity_logs tables

-- 1. Fix niche_candidates - same issue as niche_training
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON niche_candidates TO authenticated;
GRANT ALL PRIVILEGES ON niche_candidates TO anon;

-- Create policies for niche_candidates if missing
DROP POLICY IF EXISTS "Allow all for authenticated" ON niche_candidates;
CREATE POLICY "Allow all for authenticated"
  ON niche_candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Fix activity_logs
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
GRANT ALL PRIVILEGES ON activity_logs TO anon;

DROP POLICY IF EXISTS "Allow all for authenticated" ON activity_logs;
CREATE POLICY "Allow all for authenticated"
  ON activity_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. Enable RLS on both if not already
ALTER TABLE niche_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';

-- 5. Verify grants
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('niche_candidates', 'activity_logs')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;
