-- Check for duplicates in niche_fees table
-- Look for multiple fee records for the same person/training combination

-- 1. Check for duplicate fee records by name and training
SELECT 
    'DUPLICATE FEE RECORDS' as issue_type,
    nt.name,
    nt.phone,
    nt.course_type,
    COUNT(*) as duplicate_count,
    STRING_AGG(nf.id::text, ', ') as fee_ids,
    STRING_AGG(nf.total_paid::text, ', ') as amounts
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
GROUP BY nt.name, nt.phone, nt.course_type
HAVING COUNT(*) > 1
ORDER BY nt.name;

-- 2. Check for duplicate training records (same person, multiple entries)
SELECT 
    'DUPLICATE TRAINING RECORDS' as issue_type,
    name,
    phone,
    course_type,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as training_ids
FROM niche_training
GROUP BY name, phone, course_type
HAVING COUNT(*) > 1
ORDER BY name;

-- 3. Check for orphaned fee records (fees without training)
SELECT 
    'ORPHANED FEE RECORDS' as issue_type,
    nf.id as fee_id,
    nf.training_id,
    nf.total_paid
FROM niche_fees nf
LEFT JOIN niche_training nt ON nf.training_id = nt.id
WHERE nt.id IS NULL;

-- 4. Check for training records without fees
SELECT 
    'TRAINING WITHOUT FEES' as issue_type,
    nt.id as training_id,
    nt.name,
    nt.phone,
    nt.course_type
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nf.id IS NULL
ORDER BY nt.name;

-- 5. Summary of all fee records
SELECT 
    'SUMMARY' as type,
    COUNT(DISTINCT nf.id) as total_fee_records,
    COUNT(DISTINCT nf.training_id) as unique_training_ids,
    COUNT(DISTINCT nt.name) as unique_names,
    SUM(nf.total_paid) as total_fees
FROM niche_fees nf
LEFT JOIN niche_training nt ON nf.training_id = nt.id;

-- 6. Show specific duplicates with details
SELECT 
    'DETAILED DUPLICATES' as type,
    nt.name,
    nt.phone,
    nt.course_type,
    nf.id as fee_id,
    nf.total_paid,
    nf.created_at
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE (nt.name, nt.phone, nt.course_type) IN (
    SELECT name, phone, course_type
    FROM niche_training nt2
    JOIN niche_fees nf2 ON nt2.id = nf2.training_id
    GROUP BY name, phone, course_type
    HAVING COUNT(*) > 1
)
ORDER BY nt.name, nf.created_at;