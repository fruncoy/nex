-- Check for duplicates in niche_fees table (corrected version)
-- Using only existing columns

-- 1. Check for duplicate fee records by name and phone
SELECT 
    'DUPLICATE FEE RECORDS' as issue_type,
    nt.name,
    nt.phone,
    COUNT(*) as duplicate_count,
    STRING_AGG(nf.id::text, ', ') as fee_ids,
    STRING_AGG(nf.total_paid::text, ', ') as amounts,
    STRING_AGG(nf.payment_status, ', ') as statuses
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
GROUP BY nt.name, nt.phone
HAVING COUNT(*) > 1
ORDER BY nt.name;

-- 2. Check for duplicate training records (same person, multiple entries)
SELECT 
    'DUPLICATE TRAINING RECORDS' as issue_type,
    name,
    phone,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as training_ids,
    STRING_AGG(status, ', ') as statuses
FROM niche_training
GROUP BY name, phone
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
    nt.status
FROM niche_training nt
LEFT JOIN niche_fees nf ON nt.id = nf.training_id
WHERE nf.id IS NULL
ORDER BY nt.name;

-- 5. Show detailed duplicates with all info
SELECT 
    'DETAILED DUPLICATES' as type,
    nt.name,
    nt.phone,
    nf.id as fee_id,
    nf.course_fee,
    nf.total_paid,
    nf.payment_status,
    nf.created_at
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
WHERE (nt.name, nt.phone) IN (
    SELECT name, phone
    FROM niche_training nt2
    JOIN niche_fees nf2 ON nt2.id = nf2.training_id
    GROUP BY name, phone
    HAVING COUNT(*) > 1
)
ORDER BY nt.name, nf.created_at;

-- 6. Summary of all fee records
SELECT 
    'SUMMARY' as type,
    COUNT(DISTINCT nf.id) as total_fee_records,
    COUNT(DISTINCT nf.training_id) as unique_training_ids,
    COUNT(DISTINCT nt.name) as unique_names,
    SUM(nf.total_paid) as total_fees
FROM niche_fees nf
LEFT JOIN niche_training nt ON nf.training_id = nt.id;