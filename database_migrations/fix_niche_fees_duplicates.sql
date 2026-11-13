-- Fix duplicate fee records in niche_fees table
-- This script will remove duplicate fee records, keeping only one per person/training

-- Step 1: Identify and show duplicates before deletion
WITH duplicate_fees AS (
    SELECT 
        nt.name,
        nt.phone,
        nt.course_type,
        nf.id as fee_id,
        nf.training_id,
        nf.total_paid,
        ROW_NUMBER() OVER (
            PARTITION BY nt.name, nt.phone, nt.course_type 
            ORDER BY nf.id
        ) as row_num
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
)
SELECT 
    'DUPLICATES TO REMOVE' as action,
    name,
    phone,
    course_type,
    fee_id,
    total_paid
FROM duplicate_fees 
WHERE row_num > 1
ORDER BY name;

-- Step 2: Delete duplicate payments first (to avoid foreign key issues)
DELETE FROM niche_payments 
WHERE fee_id IN (
    SELECT fee_id FROM (
        SELECT 
            nf.id as fee_id,
            ROW_NUMBER() OVER (
                PARTITION BY nt.name, nt.phone, nt.course_type 
                ORDER BY nf.id
            ) as row_num
        FROM niche_fees nf
        JOIN niche_training nt ON nf.training_id = nt.id
    ) ranked_fees
    WHERE row_num > 1
);

-- Step 3: Delete duplicate fee records (keep the first one for each person/course)
DELETE FROM niche_fees 
WHERE id IN (
    SELECT fee_id FROM (
        SELECT 
            nf.id as fee_id,
            ROW_NUMBER() OVER (
                PARTITION BY nt.name, nt.phone, nt.course_type 
                ORDER BY nf.id
            ) as row_num
        FROM niche_fees nf
        JOIN niche_training nt ON nf.training_id = nt.id
    ) ranked_fees
    WHERE row_num > 1
);

-- Step 4: Verify cleanup - should show no duplicates
SELECT 
    'AFTER CLEANUP' as status,
    nt.name,
    nt.phone,
    nt.course_type,
    COUNT(*) as fee_count
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
GROUP BY nt.name, nt.phone, nt.course_type
HAVING COUNT(*) > 1
ORDER BY nt.name;

-- Step 5: Final summary
SELECT 
    'FINAL SUMMARY' as type,
    COUNT(DISTINCT nf.id) as total_fee_records,
    COUNT(DISTINCT nf.training_id) as unique_training_ids,
    COUNT(DISTINCT nt.name) as unique_names
FROM niche_fees nf
LEFT JOIN niche_training nt ON nf.training_id = nt.id;