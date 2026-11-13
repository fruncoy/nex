-- Delete Keziah from niche_training
DELETE FROM niche_training
WHERE id = 'ff9cd3df-7a71-462e-8bfc-92bfff978cf0';

-- Check ALL statuses in niche_training
SELECT 
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Check if "Completed" exists at all
SELECT 
  'Checking Completed status' as info,
  COUNT(*) as completed_count
FROM niche_training
WHERE status = 'Completed';

-- Show recent updates to see if Completed was saved
SELECT 
  'Recent updates' as info,
  name,
  status,
  updated_at
FROM niche_training
ORDER BY updated_at DESC NULLS LAST
LIMIT 10;
