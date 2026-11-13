-- Check what columns exist in niche_training
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'niche_training'
ORDER BY ordinal_position;
