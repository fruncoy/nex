-- Delete Caroline Atieno (no phone number, can't be matched)

BEGIN;

DELETE FROM niche_training
WHERE id = '92d133ae-8640-4f5b-8865-6b49c5496bbd';

-- Verify deletion
SELECT 
  'Final short course count' as check_type,
  COUNT(*) as total
FROM niche_training
WHERE training_type = 'shortcourse';

-- Final summary
SELECT 
  'FINAL SUMMARY' as report,
  (SELECT COUNT(*) FROM niche_training WHERE training_type = 'shortcourse') as total_short_courses,
  (SELECT COUNT(*) FROM niche_training WHERE training_type = 'shortcourse' AND status = 'Completed') as completed_short_courses,
  (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Completed') as completed_candidates;

COMMIT;
