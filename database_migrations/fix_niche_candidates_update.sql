-- Fix niche_candidates UPDATE permission (same fix as before, re-apply)
GRANT ALL PRIVILEGES ON niche_candidates TO authenticated;
ALTER TABLE niche_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON niche_candidates;
CREATE POLICY "Allow all for authenticated"
  ON niche_candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Also check if niche_candidates has triggers that reference niche_training
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'niche_candidates'::regclass
AND tgisinternal = false;

NOTIFY pgrst, 'reload schema';
