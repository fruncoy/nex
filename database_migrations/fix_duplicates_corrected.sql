-- Fix duplicate fee records (corrected version)
-- Remove duplicate fee records, keeping only one per person

-- Step 1: Show duplicates that will be removed
WITH duplicate_fees AS (
    SELECT 
        nt.name,
        nt.phone,
        nf.id as fee_id,
        nf.training_id,
        nf.total_paid,
        nf.payment_status,
        ROW_NUMBER() OVER (
            PARTITION BY nt.name, nt.phone 
            ORDER BY nf.created_at, nf.id
        ) as row_num
    FROM niche_fees nf
    JOIN niche_training nt ON nf.training_id = nt.id
)
SELECT 
    'DUPLICATES TO REMOVE' as action,
    name,
    phone,
    fee_id,
    total_paid,
    payment_status
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
                PARTITION BY nt.name, nt.phone 
                ORDER BY nf.created_at, nf.id
            ) as row_num
        FROM niche_fees nf
        JOIN niche_training nt ON nf.training_id = nt.id
    ) ranked_fees
    WHERE row_num > 1
);

-- Step 3: Delete duplicate fee records (keep the first one for each person)
DELETE FROM niche_fees 
WHERE id IN (
    SELECT fee_id FROM (
        SELECT 
            nf.id as fee_id,
            ROW_NUMBER() OVER (
                PARTITION BY nt.name, nt.phone 
                ORDER BY nf.created_at, nf.id
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
    COUNT(*) as fee_count
FROM niche_fees nf
JOIN niche_training nt ON nf.training_id = nt.id
GROUP BY nt.name, nt.phone
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