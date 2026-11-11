-- ============================================================================
-- PERMANENT SYNC HEALTH CHECK & VERIFICATION
-- Run this periodically to ensure all tables are synchronized correctly
-- ============================================================================

-- ============================================================================
-- PART 1: Check for Missing Records
-- ============================================================================

-- Check: All trainees must exist in candidates
SELECT 'TRAINING → CANDIDATES' as check_type,
  COUNT(*) as missing_count,
  'People in training but not in candidates' as issue
FROM niche_training nt
WHERE nt.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
  );

-- Check: All staff should exist in candidates (if they came from training)
-- Note: Some staff may be manually added, so this is informational only
SELECT 'STAFF → CANDIDATES' as check_type,
  COUNT(*) as staff_without_candidates,
  'Staff members not in candidates (may be manually added)' as note
FROM newstaff_members sm
WHERE sm.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(sm.phone)
  );

-- ============================================================================
-- PART 2: Check Status Consistency
-- ============================================================================

-- Check: Blacklisted candidates should be blacklisted in staff
SELECT 'BLACKLIST SYNC' as check_type,
  COUNT(*) as mismatched_count,
  'Blacklisted candidates not blacklisted in staff' as issue
FROM niche_candidates nc
JOIN newstaff_members sm ON normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
WHERE nc.status = 'BLACKLISTED'
  AND sm.employment_status != 'Blacklisted';

-- Check: Blacklisted staff should be blacklisted in candidates
SELECT 'BLACKLIST SYNC (REVERSE)' as check_type,
  COUNT(*) as mismatched_count,
  'Blacklisted staff not blacklisted in candidates' as issue
FROM newstaff_members sm
JOIN niche_candidates nc ON normalize_phone_niche(nc.phone) = normalize_phone_niche(sm.phone)
WHERE sm.employment_status = 'Blacklisted'
  AND nc.status != 'BLACKLISTED';

-- ============================================================================
-- PART 3: Check Graduate Integrity (IMPORTANT!)
-- ============================================================================

-- Check: Graduated trainees should NOT be "Expelled" (this would be the bug)
-- This should return 0 if everything is working correctly
SELECT 'GRADUATE INTEGRITY' as check_type,
  COUNT(*) as incorrect_count,
  'Graduated trainees incorrectly marked as Expelled' as issue
FROM niche_training nt
JOIN niche_candidates nc ON normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
JOIN newstaff_members sm ON normalize_phone_niche(sm.phone) = normalize_phone_niche(nt.phone)
WHERE nc.status = 'BLACKLISTED'
  AND sm.employment_status = 'Blacklisted'
  AND nt.status = 'Expelled';

-- ============================================================================
-- PART 4: Auto-Fix Minor Issues (Optional - uncomment to run)
-- ============================================================================

-- Fix: Sync blacklist status from candidates to staff
-- UPDATE newstaff_members sm
-- SET employment_status = 'Blacklisted'
-- FROM niche_candidates nc
-- WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
--   AND nc.status = 'BLACKLISTED'
--   AND sm.employment_status != 'Blacklisted';

-- Fix: Sync blacklist status from staff to candidates
-- UPDATE niche_candidates nc
-- SET status = 'BLACKLISTED'
-- FROM newstaff_members sm
-- WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
--   AND sm.employment_status = 'Blacklisted'
--   AND nc.status != 'BLACKLISTED';

-- ============================================================================
-- PART 5: Summary Report
-- ============================================================================

SELECT 
  'SUMMARY' as report_type,
  (SELECT COUNT(*) FROM niche_candidates) as total_candidates,
  (SELECT COUNT(*) FROM niche_training) as total_in_training,
  (SELECT COUNT(*) FROM newstaff_members) as total_staff,
  (SELECT COUNT(*) FROM niche_candidates WHERE status = 'BLACKLISTED') as blacklisted_candidates,
  (SELECT COUNT(*) FROM newstaff_members WHERE employment_status = 'Blacklisted') as blacklisted_staff,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Graduated') as graduated_trainees,
  (SELECT COUNT(*) FROM niche_training WHERE status = 'Expelled') as expelled_trainees;
