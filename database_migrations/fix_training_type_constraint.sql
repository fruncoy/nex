-- Fix the training_type constraint to allow "shortcourse"

BEGIN;

-- Drop the old constraint
ALTER TABLE niche_training
DROP CONSTRAINT IF EXISTS niche_training_training_type_check;

-- Add new constraint that allows shortcourse
ALTER TABLE niche_training
ADD CONSTRAINT niche_training_training_type_check
CHECK (training_type IN ('2week', 'weekend', 'shortcourse'));

-- Now rename weekend to shortcourse
UPDATE niche_training
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

-- Show status by training type
SELECT 
  'Status by training type' as check_type,
  training_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type, status
ORDER BY training_type, status;

COMMIT;
