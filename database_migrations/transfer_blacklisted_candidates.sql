-- Transfer blacklisted candidates to niche_candidates

-- First, drop the existing check constraint safely
ALTER TABLE niche_candidates 
  DROP CONSTRAINT IF EXISTS niche_candidates_status_check;

-- Now transfer data first, then add a more comprehensive constraint later
-- Transfer from blacklist table (if exists)
INSERT INTO niche_candidates (
  name,
  phone,
  source,
  role,
  inquiry_date,
  status,
  qualification_notes,
  added_by
)
SELECT 
  name,
  phone,
  'Blacklist Transfer' AS source,
  'Unknown' AS role,
  COALESCE(created_at::date, CURRENT_DATE) AS inquiry_date,
  'BLACKLISTED' AS status,
  reason AS qualification_notes,
  'System' AS added_by
FROM blacklist
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc 
  WHERE nc.phone = blacklist.phone
)
ON CONFLICT (phone) DO NOTHING;

-- Transfer from candidates table where status is BLACKLISTED
INSERT INTO niche_candidates (
  name,
  phone,
  source,
  role,
  inquiry_date,
  status,
  age,
  email,
  qualification_notes,
  added_by
)
SELECT 
  name,
  phone,
  COALESCE(source, 'Old Candidates Transfer'),
  COALESCE(role, 'Unknown'),
  COALESCE(inquiry_date::date, CURRENT_DATE),
  'BLACKLISTED' AS status,
  age,
  email,
  notes AS qualification_notes,
  COALESCE(added_by, 'System') AS added_by
FROM candidates
WHERE status = 'BLACKLISTED'
AND NOT EXISTS (
  SELECT 1 FROM niche_candidates nc 
  WHERE nc.phone = candidates.phone
)
ON CONFLICT (phone) DO NOTHING;
