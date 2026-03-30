-- Data Migration Script: Move Feb 1, 2025 to current candidates to NICHE system
-- Run this after creating the niche tables

-- Step 1: Migrate candidates from Feb 1, 2025 to current
INSERT INTO niche_candidates (
  name, phone, source, role, inquiry_date, status, scheduled_date, assigned_to, added_by,
  live_arrangement, work_schedule, employment_type, expected_salary, age, place_of_birth,
  next_of_kin_1_phone, next_of_kin_1_name, next_of_kin_1_location,
  next_of_kin_2_phone, next_of_kin_2_name, next_of_kin_2_location,
  referee_1_phone, referee_1_name, referee_2_phone, referee_2_name,
  address, apartment, total_years_experience, has_good_conduct_cert,
  good_conduct_cert_receipt, good_conduct_status, work_experiences,
  kenya_years, qualification_score, qualification_notes, preferred_interview_date,
  id_number, email, county, town, estate, marital_status, has_kids, kids_count,
  has_parents, off_day, has_siblings, dependent_siblings, education_level,
  created_at
)
SELECT 
  name, phone, source, role, inquiry_date, 
  -- Map old statuses to new NICHE statuses
  CASE 
    WHEN status = 'PENDING' THEN 'Pending'
    WHEN status = 'Pending Review' THEN 'Pending'
    WHEN status = 'INTERVIEW_SCHEDULED' THEN 'Interview Scheduled'
    WHEN status = 'WON' THEN 'Graduated'
    WHEN status = 'WON - Interview Won' THEN 'Graduated'
    WHEN status = 'Lost - Interview Lost' THEN 'Lost - Failed Interview'
    WHEN status = 'Lost - Missed Interview' THEN 'Lost - No Show Interview'
    WHEN status = 'Lost, Age' THEN 'Lost - Age'
    WHEN status = 'Lost, No References' THEN 'Lost - No References'
    WHEN status = 'Lost, No Response' THEN 'Lost - No Response'
    WHEN status = 'Lost, Personality' THEN 'Lost - Other'
    WHEN status = 'Lost, Salary' THEN 'Lost - Other'
    WHEN status = 'Lost, Experience' THEN 'Lost - Other'
    WHEN status = 'Lost, No Good Conduct' THEN 'Lost - Other'
    WHEN status = 'BLACKLISTED' THEN 'BLACKLISTED'
    WHEN status = 'Pending, applying GC' THEN 'Pending'
    ELSE 'Pending'
  END as status,
  scheduled_date, assigned_to, added_by,
  live_arrangement, work_schedule, employment_type, expected_salary, age, place_of_birth,
  next_of_kin_1_phone, next_of_kin_1_name, next_of_kin_1_location,
  next_of_kin_2_phone, next_of_kin_2_name, next_of_kin_2_location,
  referee_1_phone, referee_1_name, referee_2_phone, referee_2_name,
  address, apartment, total_years_experience, has_good_conduct_cert,
  good_conduct_cert_receipt, good_conduct_status, work_experiences,
  kenya_years, qualification_score, qualification_notes, preferred_interview_date,
  id_number, email, county, town, estate, marital_status, has_kids, kids_count,
  has_parents, off_day, has_siblings, dependent_siblings, education_level,
  created_at
FROM candidates 
WHERE inquiry_date >= '2025-02-01'
AND status != 'ARCHIVED'
ON CONFLICT (phone) DO NOTHING; -- Skip duplicates

-- Step 2: Migrate related interviews
INSERT INTO niche_interviews (niche_candidate_id, date_time, location, assigned_staff, attended, outcome, notes, created_at)
SELECT 
  nc.id, i.date_time, 
  COALESCE(i.location, 'Office') as location,
  i.assigned_staff, i.attended, i.outcome, 
  COALESCE(i.notes, '') as notes,
  i.created_at
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
JOIN niche_candidates nc ON c.phone = nc.phone  -- Match by phone number
WHERE c.inquiry_date >= '2025-02-01'
AND c.status != 'ARCHIVED';

-- Step 3: Migrate candidate notes
INSERT INTO niche_candidate_notes (niche_candidate_id, note, created_by, created_at, read_by)
SELECT 
  nc.id, cn.note, cn.created_by, cn.created_at, 
  COALESCE(cn.read_by, '{}'::jsonb) as read_by
FROM candidate_notes cn
JOIN candidates c ON cn.candidate_id = c.id
JOIN niche_candidates nc ON c.phone = nc.phone  -- Match by phone number
WHERE c.inquiry_date >= '2025-02-01'
AND c.status != 'ARCHIVED';

-- Step 4: Archive old candidates (keep only BLACKLISTED in main system)
-- First, create archive table for historical data
CREATE TABLE IF NOT EXISTS candidates_archive AS 
SELECT * FROM candidates 
WHERE inquiry_date < '2025-02-01' 
AND status != 'BLACKLISTED';

-- Archive interviews for old candidates
CREATE TABLE IF NOT EXISTS interviews_archive AS
SELECT i.* FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
WHERE c.inquiry_date < '2025-02-01'
AND c.status != 'BLACKLISTED';

-- Archive candidate notes for old candidates  
CREATE TABLE IF NOT EXISTS candidate_notes_archive AS
SELECT cn.* FROM candidate_notes cn
JOIN candidates c ON cn.candidate_id = c.id
WHERE c.inquiry_date < '2025-02-01'
AND c.status != 'BLACKLISTED';

-- Step 5: Clean up main candidates table (keep only BLACKLISTED)
-- Delete migrated candidates (Feb 1st onwards, except BLACKLISTED)
DELETE FROM candidate_notes 
WHERE candidate_id IN (
  SELECT id FROM candidates 
  WHERE inquiry_date >= '2025-02-01' 
  AND status != 'BLACKLISTED'
);

DELETE FROM interviews 
WHERE candidate_id IN (
  SELECT id FROM candidates 
  WHERE inquiry_date >= '2025-02-01' 
  AND status != 'BLACKLISTED'
);

DELETE FROM candidates 
WHERE inquiry_date >= '2025-02-01' 
AND status != 'BLACKLISTED';

-- Delete old archived candidates (before Feb 1st, except BLACKLISTED)
DELETE FROM candidate_notes 
WHERE candidate_id IN (
  SELECT id FROM candidates 
  WHERE inquiry_date < '2025-02-01' 
  AND status != 'BLACKLISTED'
);

DELETE FROM interviews 
WHERE candidate_id IN (
  SELECT id FROM candidates 
  WHERE inquiry_date < '2025-02-01' 
  AND status != 'BLACKLISTED'
);

DELETE FROM candidates 
WHERE inquiry_date < '2025-02-01' 
AND status != 'BLACKLISTED';

-- Verification queries (run these to check migration success)
-- SELECT COUNT(*) as "NICHE Candidates Migrated" FROM niche_candidates;
-- SELECT COUNT(*) as "NICHE Interviews Migrated" FROM niche_interviews;
-- SELECT COUNT(*) as "NICHE Notes Migrated" FROM niche_candidate_notes;
-- SELECT COUNT(*) as "Remaining Main Candidates (should be BLACKLISTED only)" FROM candidates;
-- SELECT status, COUNT(*) FROM niche_candidates GROUP BY status ORDER BY status;