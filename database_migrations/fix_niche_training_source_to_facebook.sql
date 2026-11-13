-- Fix source for candidates synced from NICHE Training
-- They should have source as "Facebook" not "NICHE Training"

BEGIN;

-- Show current candidates with "NICHE Training" source
SELECT 
  'Current NICHE Training source candidates' as info,
  COUNT(*) as count
FROM niche_candidates
WHERE source = 'NICHE Training';

-- Show sample of candidates that will be updated
SELECT 
  'Sample candidates to update' as info,
  name,
  phone,
  source,
  status,
  added_by
FROM niche_candidates
WHERE source = 'NICHE Training'
ORDER BY created_at DESC
LIMIT 10;

-- Update source from "NICHE Training" to "Facebook"
UPDATE niche_candidates
SET source = 'Facebook'
WHERE source = 'NICHE Training';

-- Show results after update
SELECT 
  'Updated candidates' as result,
  COUNT(*) as count
FROM niche_candidates
WHERE source = 'Facebook' 
  AND added_by IN ('SYSTEM_SYNC', 'SYSTEM_SYNC_SUSPENDED', 'SYSTEM_SYNC_EXPELLED');

-- Show final source breakdown
SELECT 
  'Final source breakdown' as info,
  source,
  COUNT(*) as count
FROM niche_candidates
GROUP BY source
ORDER BY count DESC;

-- Show sample of updated candidates
SELECT 
  'Sample updated candidates' as info,
  name,
  phone,
  source,
  status,
  added_by
FROM niche_candidates
WHERE source = 'Facebook' 
  AND added_by IN ('SYSTEM_SYNC', 'SYSTEM_SYNC_SUSPENDED', 'SYSTEM_SYNC_EXPELLED')
ORDER BY created_at DESC
LIMIT 10;

COMMIT;