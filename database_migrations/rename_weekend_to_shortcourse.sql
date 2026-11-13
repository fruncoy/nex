-- Rename "weekend" to "shortcourse" in niche_training

BEGIN;

-- Update training_type
UPDATE niche_training
SET training_type = 'shortcourse'
WHERE training_type = 'weekend';

-- Update in cohorts if needed
UPDATE niche_cohorts
SET training_type = 'shortcourse'
WHERE training_type = 'weekend';

-- Verify the change
SELECT 
  'Training types after rename' as check_type,
  training_type,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type
ORDER BY training_type;

-- Show status by new training type
SELECT 
  'Status by training type' as check_type,
  training_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type, status
ORDER BY training_type, status;

COMMIT;
