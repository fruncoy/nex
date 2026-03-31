-- COMPREHENSIVE NICHE SYSTEM DUPLICATE PREVENTION AND AUTO-SYNC (FINAL)
-- This script will:
-- 1. Create blacklist table if it doesn't exist
-- 2. Analyze current duplicates
-- 3. Create sync functions with correct status mappings
-- 4. Fix status synchronization
-- 5. Remove all duplicates properly

BEGIN;

-- =====================================================
-- STEP 0: CREATE BLACKLIST TABLE IF NOT EXISTS
-- =====================================================

-- Create blacklist table if it doesn't exist
CREATE TABLE IF NOT EXISTS blacklist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text NOT NULL UNIQUE,
    reason text,
    created_by text DEFAULT 'SYSTEM',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for blacklist table
CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_blacklist_name ON blacklist(name);

-- Enable RLS for blacklist table
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- Create policies for blacklist table
DROP POLICY IF EXISTS "Users can view blacklist" ON blacklist;
DROP POLICY IF EXISTS "Users can insert blacklist" ON blacklist;
DROP POLICY IF EXISTS "Users can update blacklist" ON blacklist;

CREATE POLICY "Users can view blacklist"
    ON blacklist FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert blacklist"
    ON blacklist FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update blacklist"
    ON blacklist FOR UPDATE
    TO authenticated
    USING (true);

-- =====================================================
-- STEP 1: ANALYZE CURRENT STATE
-- =====================================================

SELECT 'ANALYSIS: Current duplicates and status issues' as analysis_step;

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

-- =====================================================
-- STEP 2: REMOVE DUPLICATES FIRST
-- =====================================================

SELECT 'STEP 2: Removing duplicates from both tables' as step;

-- Remove duplicates from niche_training (keep most recent)
WITH training_duplicates AS (
    SELECT 
        id,
        normalize_phone_niche(phone) as norm_phone,
        ROW_NUMBER() OVER (
            PARTITION BY normalize_phone_niche(phone) 
            ORDER BY created_at DESC, id DESC
        ) as rn
    FROM niche_training
    WHERE phone IS NOT NULL AND phone != ''
)
DELETE FROM niche_training 
WHERE id IN (
    SELECT id FROM training_duplicates WHERE rn > 1
);

-- Remove duplicates from niche_candidates (keep most recent)
WITH candidate_duplicates AS (
    SELECT 
        id,
        normalize_phone_niche(phone) as norm_phone,
        ROW_NUMBER() OVER (
            PARTITION BY normalize_phone_niche(phone) 
            ORDER BY created_at DESC, id DESC
        ) as rn
    FROM niche_candidates
    WHERE phone IS NOT NULL AND phone != ''
)
DELETE FROM niche_candidates 
WHERE id IN (
    SELECT id FROM candidate_duplicates WHERE rn > 1
);

-- Normalize all existing phone numbers
UPDATE niche_training 
SET phone = normalize_phone_niche(phone)
WHERE phone IS NOT NULL AND phone != '';

UPDATE niche_candidates 
SET phone = normalize_phone_niche(phone)
WHERE phone IS NOT NULL AND phone != '';

-- =====================================================
-- STEP 3: CREATE SYNC FUNCTIONS WITH CORRECT MAPPINGS
-- =====================================================

-- Function to sync status from niche_training to niche_candidates
CREATE OR REPLACE FUNCTION sync_niche_training_to_candidates()
RETURNS TRIGGER AS $$
DECLARE
    candidate_record RECORD;
    new_candidate_status TEXT;
BEGIN
    -- Determine the candidate status based on training status
    -- CORRECTED MAPPINGS: Expelled goes to BLACKLISTED
    new_candidate_status := CASE 
        WHEN NEW.status = 'Active' THEN 'Active in Training'
        WHEN NEW.status = 'Graduated' THEN 'Graduated'
        WHEN NEW.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED: Expelled → BLACKLISTED
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
                role = COALESCE(NEW.role, role),  -- Update role if provided
                category = CASE 
                    WHEN NEW.training_type = 'weekend' THEN 'Short Course'
                    ELSE '2-Week Flagship'
                END
            WHERE id = candidate_record.id;
            
            -- If expelled, also add to blacklist
            IF NEW.status = 'Expelled' THEN
                INSERT INTO blacklist (name, phone, reason, created_by, created_at)
                VALUES (
                    NEW.name,
                    normalize_phone_niche(NEW.phone),
                    'Expelled from NICHE Training',
                    COALESCE(NEW.updated_by, 'SYSTEM'),
                    NOW()
                )
                ON CONFLICT (phone) DO UPDATE SET
                    reason = 'Expelled from NICHE Training',
                    updated_at = NOW();
            END IF;
        ELSE
            -- Create new candidate record (only if not expelled)
            IF NEW.status != 'Expelled' THEN
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
            ELSE
                -- If expelled and no candidate exists, add directly to blacklist
                INSERT INTO blacklist (name, phone, reason, created_by, created_at)
                VALUES (
                    NEW.name,
                    normalize_phone_niche(NEW.phone),
                    'Expelled from NICHE Training',
                    COALESCE(NEW.created_by, 'SYSTEM'),
                    NOW()
                )
                ON CONFLICT (phone) DO UPDATE SET
                    reason = 'Expelled from NICHE Training',
                    updated_at = NOW();
            END IF;
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
-- STEP 4: CREATE TRIGGERS
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
-- STEP 5: SYNC EXISTING DATA WITH CORRECT MAPPINGS
-- =====================================================

SELECT 'STEP 5: Syncing existing data with correct status mappings' as step;

-- Add expelled trainees to blacklist first
INSERT INTO blacklist (name, phone, reason, created_by, created_at)
SELECT DISTINCT
    nt.name,
    normalize_phone_niche(nt.phone),
    'Expelled from NICHE Training',
    COALESCE(nt.updated_by, 'SYSTEM'),
    NOW()
FROM niche_training nt
WHERE nt.status = 'Expelled'
AND nt.phone IS NOT NULL 
AND nt.phone != ''
ON CONFLICT (phone) DO UPDATE SET
    reason = 'Expelled from NICHE Training',
    updated_at = NOW();

-- Update existing candidates based on training records
UPDATE niche_candidates nc
SET 
    status = CASE 
        WHEN nt.status = 'Active' THEN 'Active in Training'
        WHEN nt.status = 'Graduated' THEN 'Graduated'
        WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
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
    WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
    ELSE nt.status
END;

-- Insert missing candidates from training records (excluding expelled)
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
        WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
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
AND nt.status != 'Expelled'  -- Don't create candidates for expelled trainees
AND NOT EXISTS (
    SELECT 1 FROM niche_candidates nc 
    WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
);

-- =====================================================
-- STEP 6: CREATE MANUAL SYNC FUNCTION (UPDATED)
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
    -- Add expelled trainees to blacklist during sync
    INSERT INTO blacklist (name, phone, reason, created_by, created_at)
    SELECT DISTINCT
        nt.name,
        normalize_phone_niche(nt.phone),
        'Expelled from NICHE Training',
        'FORCE_SYNC',
        NOW()
    FROM niche_training nt
    WHERE nt.status = 'Expelled'
    AND nt.phone IS NOT NULL 
    AND nt.phone != ''
    ON CONFLICT (phone) DO UPDATE SET
        reason = 'Expelled from NICHE Training',
        updated_at = NOW();

    -- Return updated records
    RETURN QUERY
    WITH updates AS (
        UPDATE niche_candidates nc
        SET 
            status = CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
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
            WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
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
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
                ELSE nt.status
            END as new_status
    )
    SELECT * FROM updates;
    
    -- Return inserted records (excluding expelled)
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
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'  -- CORRECTED
                ELSE nt.status
            END,
            'FORCE_SYNC',
            CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END,
            nt.created_at
        FROM niche_training nt
        WHERE nt.phone IS NOT NULL 
        AND nt.phone != ''
        AND nt.status != 'Expelled'  -- Don't create candidates for expelled
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
-- STEP 7: FINAL VERIFICATION
-- =====================================================

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
    'Total blacklist records' as metric,
    COUNT(*) as count
FROM blacklist;

SELECT 
    'Status distribution in niche_candidates' as metric,
    status,
    COUNT(*) as count
FROM niche_candidates
GROUP BY status
ORDER BY count DESC;

-- Check remaining duplicates (should be 0)
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

-- Show blacklisted expelled trainees
SELECT 
    'Expelled trainees added to blacklist' as info,
    COUNT(*) as count
FROM blacklist
WHERE reason = 'Expelled from NICHE Training';

COMMIT;

-- Usage Instructions:
-- 1. Run this script to set up auto-sync and fix existing duplicates
-- 2. To manually force sync from UI, call: SELECT * FROM force_sync_niche_candidates();
-- 3. The triggers will automatically prevent duplicates and sync statuses going forward
-- 4. Expelled trainees are now properly handled: status → BLACKLISTED, added to blacklist table
-- 5. Blacklist table is created automatically if it doesn't exist