-- Final status counts after all fixes

-- Training table counts
SELECT 
  'TRAINING STATUS COUNTS' as table_name,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY status
ORDER BY count DESC;

-- Training by type and status
SELECT 
  'TRAINING BY TYPE' as table_name,
  training_type,
  status,
  COUNT(*) as count
FROM niche_training
GROUP BY training_type, status
ORDER BY training_type, status;

-- Candidates table counts
SELECT 
  'CANDIDATES STATUS COUNTS' as table_name,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Total blacklisted candidates
SELECT 
  'BLACKLISTED CANDIDATES' as check_type,
  COUNT(*) as total_blacklisted
FROM niche_candidates
WHERE status = 'BLACKLISTED';

-- Total expelled in training
SELECT 
  'EXPELLED TRAINEES' as check_type,
  COUNT(*) as total_expelled
FROM niche_training
WHERE status = 'Expelled';

-- Total short courses
SELECT 
  'SHORT COURSES' as check_type,
  COUNT(*) as total_short_courses
FROM niche_training
WHERE training_type = 'shortcourse';

-- Total completed
SELECT 
  'COMPLETED STATUS' as check_type,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Completed') as in_training,
  (SELECT COUNT(*) FROM niche_candidates WHERE status = 'Completed') as in_candidates;
