-- COMPREHENSIVE NICHE SYSTEM DUPLICATE PREVENTION AND AUTO-SYNC
-- This script will:
-- 1. Analyze current duplicates
-- 2. Create sync functions
-- 3. Fix status synchronization
-- 4. Prevent future duplicates

BEGIN;

-- =====================================================
-- STEP 1: ANALYZE CURRENT STATE
-- =====================================================

-- Check for duplicates between niche_candidates and niche_training
SELECT 'ANALYSIS: Duplicates between niche_candidates and niche_training' as analysis_step;

-- Normalize phone function for consistent comparison
CREATE OR REPLACE FUNCTION normalize_phone_niche(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN phone_input;
    END IF;
    
    -- Remove all non-digits except +
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
    
    -- Handle Kenyan formats
    IF phone_input ~ '^(\+254|254)' THEN
        phone_input := REGEXP_REPLACE(phone_input, '^\+?254', '+254');
    ELSIF phone_input ~ '^0[17]' THEN
        phone_input := '+254' || SUBSTRING(phone_input FROM 2);
    ELSIF phone_input ~ '^[17]' AND LENGTH(phone_input) = 9 THEN
        phone_input := '+254' || phone_input;
    END IF;
    
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Find duplicates by phone between tables
WITH normalized_candidates AS (
    SELECT id, name, normalize_phone_niche(phone) as norm_phone, status, 'niche_candidates' as source_table
    FROM niche_candidates
    WHERE phone IS NOT NULL AND phone != ''
),
normalized_training AS (
    SELECT id, name, normalize_phone_niche(phone) as norm_phone, status, 'niche_training' as source_table
    FROM niche_training
    WHERE phone IS NOT NULL AND phone != ''
),
all_records AS (
    SELECT * FROM normalized_candidates
    UNION ALL
    SELECT * FROM normalized_training
)
SELECT 
    'Phone duplicates across tables' as issue_type,
    norm_phone,
    COUNT(*) as total_records,
    STRING_AGG(DISTINCT source_table, ', ') as found_in_tables,
    STRING_AGG(name, ', ') as names,
    STRING_AGG(status, ', ') as statuses
FROM all_records
GROUP BY norm_phone
HAVING COUNT(*) > 1
ORDER BY total_records DESC;

-- Check status mismatches
SELECT 
    'Status mismatches' as issue_type,
    nc.name,
    nc.phone,
    nc.status as candidate_status,
    nt.status as training_status
FROM niche_candidates nc
JOIN niche_training nt ON normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
WHERE nc.status != CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    WHEN nt.status = 'Suspended' THEN 'Lost - Other'
    ELSE nt.status
END;

-- =====================================================
-- STEP 2: CREATE SYNC FUNCTIONS
-- =====================================================

-- Function to sync status from niche_training to niche_candidates
CREATE OR REPLACE FUNCTION sync_niche_training_to_candidates()
RETURNS TRIGGER AS $$
DECLARE
    candidate_record RECORD;
    new_candidate_status TEXT;
BEGIN
    -- Determine the candidate status based on training status
    new_candidate_status := CASE 
        WHEN NEW.status = 'Active' THEN 'Active in Training'
        WHEN NEW.status = 'Graduated' THEN 'Graduated'
        WHEN NEW.status = 'Expelled' THEN 'Lost - Other'
        WHEN NEW.status = 'Suspended' THEN 'Lost - Other'
        ELSE NEW.status
    END;
    
    -- Update or create candidate record
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        -- Try to find existing candidate by normalized phone
        SELECT id INTO candidate_record
        FROM niche_candidates 
        WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
        LIMIT 1;
        
        IF FOUND THEN
            -- Update existing candidate
            UPDATE niche_candidates 
            SET 
                status = new_candidate_status,
                name = COALESCE(NEW.name, name), -- Update name if provided
                role = COALESCE(NEW.role, role)  -- Update role if provided
            WHERE id = candidate_record.id;
        ELSE
            -- Create new candidate record
            INSERT INTO niche_candidates (
                name, phone, source, role, inquiry_date, status, added_by, category
            ) VALUES (
                NEW.name,
                normalize_phone_niche(NEW.phone),
                'NICHE Training',
                NEW.role,
                CURRENT_DATE,
                new_candidate_status,
                COALESCE(NEW.created_by, 'SYSTEM_SYNC'),
                CASE 
                    WHEN NEW.training_type = 'weekend' THEN 'Short Course'
                    ELSE '2-Week Flagship'
                END
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent duplicates when importing to niche_training
CREATE OR REPLACE FUNCTION prevent_niche_training_duplicates()
RETURNS TRIGGER AS $$
DECLARE
    existing_record RECORD;
BEGIN
    -- Check for existing record by normalized phone
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        SELECT id, name, status INTO existing_record
        FROM niche_training 
        WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        LIMIT 1;
        
        IF FOUND THEN
            RAISE EXCEPTION 'Duplicate phone number detected: % already exists for % (Status: %)', 
                NEW.phone, existing_record.name, existing_record.status;
        END IF;
    END IF;
    
    -- Normalize phone before saving
    NEW.phone := normalize_phone_niche(NEW.phone);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_training_to_candidates_trigger ON niche_training;
DROP TRIGGER IF EXISTS prevent_training_duplicates_trigger ON niche_training;

-- Create sync trigger (after insert/update)
CREATE TRIGGER sync_training_to_candidates_trigger
    AFTER INSERT OR UPDATE ON niche_training
    FOR EACH ROW
    EXECUTE FUNCTION sync_niche_training_to_candidates();

-- Create duplicate prevention trigger (before insert/update)
CREATE TRIGGER prevent_training_duplicates_trigger
    BEFORE INSERT OR UPDATE ON niche_training
    FOR EACH ROW
    EXECUTE FUNCTION prevent_niche_training_duplicates();

-- =====================================================
-- STEP 4: SYNC EXISTING DATA
-- =====================================================

-- Update existing candidates based on training records
UPDATE niche_candidates nc
SET 
    status = CASE 
        WHEN nt.status = 'Active' THEN 'Active in Training'
        WHEN nt.status = 'Graduated' THEN 'Graduated'
        WHEN nt.status = 'Expelled' THEN 'Lost - Other'
        WHEN nt.status = 'Suspended' THEN 'Lost - Other'
        ELSE nt.status
    END,
    category = CASE 
        WHEN nt.training_type = 'weekend' THEN 'Short Course'
        ELSE '2-Week Flagship'
    END
FROM niche_training nt
WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
AND nc.status != CASE 
    WHEN nt.status = 'Active' THEN 'Active in Training'
    WHEN nt.status = 'Graduated' THEN 'Graduated'
    WHEN nt.status = 'Expelled' THEN 'Lost - Other'
    WHEN nt.status = 'Suspended' THEN 'Lost - Other'
    ELSE nt.status
END;

-- Insert missing candidates from training records
INSERT INTO niche_candidates (
    name, phone, source, role, inquiry_date, status, added_by, category, created_at
)
SELECT DISTINCT
    nt.name,
    normalize_phone_niche(nt.phone),
    'NICHE Training',
    nt.role,
    COALESCE(nt.created_at::date, CURRENT_DATE),
    CASE 
        WHEN nt.status = 'Active' THEN 'Active in Training'
        WHEN nt.status = 'Graduated' THEN 'Graduated'
        WHEN nt.status = 'Expelled' THEN 'Lost - Other'
        WHEN nt.status = 'Suspended' THEN 'Lost - Other'
        ELSE nt.status
    END,
    'SYSTEM_SYNC',
    CASE 
        WHEN nt.training_type = 'weekend' THEN 'Short Course'
        ELSE '2-Week Flagship'
    END,
    nt.created_at
FROM niche_training nt
WHERE nt.phone IS NOT NULL 
AND nt.phone != ''
AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc 
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
);

-- =====================================================
-- STEP 5: CREATE MANUAL SYNC FUNCTION
-- =====================================================

-- Function for manual force sync (can be called from UI)
CREATE OR REPLACE FUNCTION force_sync_niche_candidates()
RETURNS TABLE(
    action TEXT,
    phone TEXT,
    name TEXT,
    old_status TEXT,
    new_status TEXT
) AS $$
BEGIN
    -- Return updated records
    RETURN QUERY
    WITH updates AS (
        UPDATE niche_candidates nc
        SET 
            status = CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'Lost - Other'
                WHEN nt.status = 'Suspended' THEN 'Lost - Other'
                ELSE nt.status
            END,
            category = CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END
        FROM niche_training nt
        WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        AND nc.status != CASE 
            WHEN nt.status = 'Active' THEN 'Active in Training'
            WHEN nt.status = 'Graduated' THEN 'Graduated'
            WHEN nt.status = 'Expelled' THEN 'Lost - Other'
            WHEN nt.status = 'Suspended' THEN 'Lost - Other'
            ELSE nt.status
        END
        RETURNING 
            'UPDATED' as action,
            nc.phone,
            nc.name,
            nc.status as old_status,
            CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'Lost - Other'
                WHEN nt.status = 'Suspended' THEN 'Lost - Other'
                ELSE nt.status
            END as new_status
    )
    SELECT * FROM updates;
    
    -- Return inserted records
    RETURN QUERY
    WITH inserts AS (
        INSERT INTO niche_candidates (
            name, phone, source, role, inquiry_date, status, added_by, category, created_at
        )
        SELECT DISTINCT
            nt.name,
            normalize_phone_niche(nt.phone),
            'NICHE Training',
            nt.role,
            COALESCE(nt.created_at::date, CURRENT_DATE),
            CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'Lost - Other'
                WHEN nt.status = 'Suspended' THEN 'Lost - Other'
                ELSE nt.status
            END,
            'SYSTEM_SYNC',
            CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END,
            nt.created_at
        FROM niche_training nt
        WHERE nt.phone IS NOT NULL 
        AND nt.phone != ''
        AND NOT EXISTS (
            SELECT 1 FROM niche_candidates nc 
            WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        )
        RETURNING 
            'INSERTED' as action,
            phone,
            name,
            'N/A' as old_status,
            status as new_status
    )
    SELECT * FROM inserts;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: FINAL VERIFICATION
-- =====================================================

-- Show sync results
SELECT 'SYNC COMPLETED - VERIFICATION' as step;

SELECT 
    'Total niche_candidates after sync' as metric,
    COUNT(*) as count
FROM niche_candidates;

SELECT 
    'Total niche_training records' as metric,
    COUNT(*) as count
FROM niche_training;

SELECT 
    'Status distribution in niche_candidates' as metric,
    status,
    COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Check remaining duplicates
WITH normalized_candidates AS (
    SELECT id, name, normalize_phone_niche(phone) as norm_phone, status, 'niche_candidates' as source_table
    FROM niche_candidates
    WHERE phone IS NOT NULL AND phone != ''
),
normalized_training AS (
    SELECT id, name, normalize_phone_niche(phone) as norm_phone, status, 'niche_training' as source_table
    FROM niche_training
    WHERE phone IS NOT NULL AND phone != ''
),
all_records AS (
    SELECT * FROM normalized_candidates
    UNION ALL
    SELECT * FROM normalized_training
)
SELECT 
    'Remaining duplicates after sync' as check_result,
    COUNT(*) as duplicate_count
FROM (
    SELECT norm_phone
    FROM all_records
    GROUP BY norm_phone
    HAVING COUNT(*) > 1
) dups;

COMMIT;

-- Usage Instructions:
-- 1. Run this script to set up auto-sync and fix existing duplicates
-- 2. To manually force sync from UI, call: SELECT * FROM force_sync_niche_candidates();
-- 3. The triggers will automatically prevent duplicates and sync statuses going forward