-- Check for expelled/blacklisted trainees in niche_training
SELECT status, COUNT(*) as count
FROM niche_training
WHERE status IN ('Expelled', 'Graduated')
GROUP BY status
ORDER BY status;

-- Check blacklisted candidates
SELECT status, COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED'
GROUP BY status;
