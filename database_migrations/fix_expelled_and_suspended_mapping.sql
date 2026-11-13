-- Fix EXPELLED candidates mapping and handle SUSPENDED candidates
-- Expelled should be BLACKLISTED, not Lost - Other

BEGIN;

-- Step 1: Fix existing expelled candidates that were mapped incorrectly
UPDATE niche_candidates nc
SET status = 'BLACKLISTED'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Expelled'
  AND nc.status = 'Lost - Other'  -- Fix the ones we mapped incorrectly
  AND nt.phone IS NOT NULL
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther');

-- Step 2: Check for any expelled candidates not yet in candidates table
WITH expelled_candidates AS (
  SELECT DISTINCT ON (REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'))
    name,
    REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') as cleaned_phone,
    status,
    created_at
  FROM niche_training
  WHERE status = 'Expelled'
    AND phone IS NOT NULL 
    AND phone NOT IN ('Makawi', 'Oganga', 'Kerry')
    AND name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
    AND REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') ~ '^[+0-9\s\-\(\)]+$'
    AND LENGTH(REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g')) >= 10
  ORDER BY REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'), created_at DESC
)
INSERT INTO niche_candidates (
  name, phone, source, inquiry_date, status, created_at, added_by
)
SELECT 
  ec.name,
  ec.cleaned_phone,
  'NICHE Training' as source,
  COALESCE(ec.created_at::date, CURRENT_DATE) as inquiry_date,
  'BLACKLISTED' as status, -- CORRECT MAPPING: Expelled → BLACKLISTED
  ec.created_at,
  'SYSTEM_SYNC_EXPELLED' as added_by
FROM expelled_candidates ec
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc 
  WHERE nc.phone = ec.cleaned_phone
);

-- Step 3: Handle suspended candidates (map to Lost - Other)
WITH suspended_candidates AS (
  SELECT DISTINCT ON (REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'))
    name,
    REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') as cleaned_phone,
    status,
    created_at
  FROM niche_training
  WHERE status = 'Suspended'
    AND phone IS NOT NULL 
    AND phone NOT IN ('Makawi', 'Oganga', 'Kerry')
    AND name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther')
    AND REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g') ~ '^[+0-9\s\-\(\)]+$'
    AND LENGTH(REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g')) >= 10
  ORDER BY REGEXP_REPLACE(TRIM(phone), '^tel:', '', 'g'), created_at DESC
)
INSERT INTO niche_candidates (
  name, phone, source, inquiry_date, status, created_at, added_by
)
SELECT 
  sc.name,
  sc.cleaned_phone,
  'NICHE Training' as source,
  COALESCE(sc.created_at::date, CURRENT_DATE) as inquiry_date,
  'Lost - Other' as status, -- Suspended → Lost - Other
  sc.created_at,
  'SYSTEM_SYNC_SUSPENDED' as added_by
FROM suspended_candidates sc
WHERE NOT EXISTS (
  SELECT 1 FROM niche_candidates nc 
  WHERE nc.phone = sc.cleaned_phone
);

-- Step 4: Update existing suspended candidates
UPDATE niche_candidates nc
SET status = 'Lost - Other'
FROM niche_training nt
WHERE nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
  AND nt.status = 'Suspended'
  AND nt.phone IS NOT NULL
  AND nt.phone NOT IN ('Makawi', 'Oganga', 'Kerry')
  AND nt.name NOT IN ('Hannah', 'Keziah', 'Winnie', 'Esther');

-- Show results
SELECT 'CORRECTED STATUS MAPPING' as phase;

-- Show expelled candidates now correctly mapped to BLACKLISTED
SELECT 
  'Expelled candidates now BLACKLISTED' as info,
  COUNT(*) as count
FROM niche_candidates nc
INNER JOIN niche_training nt ON nc.phone = REGEXP_REPLACE(TRIM(nt.phone), '^tel:', '', 'g')
WHERE nt.status = 'Expelled' AND nc.status = 'BLACKLISTED';

-- Show suspended candidates
SELECT 
  'Suspended candidates handled' as info,
  COUNT(*) as count
FROM niche_candidates
WHERE added_by = 'SYSTEM_SYNC_SUSPENDED';

-- Final status breakdown with correct mapping
SELECT 
  'FINAL STATUS BREAKDOWN (Corrected)' as info,
  status,
  COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Show the correct status mapping being used
SELECT 
  'CORRECT STATUS MAPPING' as info,
  nt.status as training_status,
  CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
    WHEN nt.status = 'Suspended' THEN 'Lost - Other'
    WHEN nt.status = 'Pending' THEN 'Pending'
    ELSE nt.status
  END as candidate_status,
  COUNT(*) as count
FROM niche_training nt
GROUP BY nt.status
ORDER BY count DESC;

COMMIT;