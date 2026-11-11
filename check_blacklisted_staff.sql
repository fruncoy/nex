-- Check for blacklisted staff in newstaff_members
SELECT employment_status, COUNT(*) as count
FROM newstaff_members
GROUP BY employment_status
ORDER BY count DESC;

-- Check for blacklisted candidates
SELECT status, COUNT(*) as count
FROM niche_candidates
WHERE status = 'BLACKLISTED'
GROUP BY status;
