-- Fix niche_candidates permissions
GRANT ALL PRIVILEGES ON niche_candidates TO authenticated;
ALTER TABLE niche_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON niche_candidates;
CREATE POLICY "Allow all for authenticated"
  ON niche_candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Fix activity_logs UUID issue and permissions
ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;
GRANT ALL PRIVILEGES ON activity_logs TO authenticated;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON activity_logs;
CREATE POLICY "Allow all for authenticated"
  ON activity_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Verify
SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('niche_candidates', 'activity_logs')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

NOTIFY pgrst, 'reload schema';
