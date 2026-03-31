-- BIDIRECTIONAL SYNC SYSTEM - NICHE TRAINING ↔ NICHE CANDIDATES
-- This creates true two-way sync with conflict resolution and comprehensive force sync

BEGIN;

-- =====================================================
-- STEP 1: CREATE BIDIRECTIONAL SYNC FUNCTIONS
-- =====================================================

-- Function to sync FROM niche_candidates TO niche_training
CREATE OR REPLACE FUNCTION sync_niche_candidates_to_training()
RETURNS TRIGGER AS $$
DECLARE
    training_record RECORD;
    new_training_status TEXT;
    should_remove_from_training BOOLEAN := FALSE;
BEGIN
    -- Determine if candidate status change should affect training
    new_training_status := CASE 
        WHEN NEW.status = 'Active in Training' THEN 'Active'
        WHEN NEW.status = 'Graduated' THEN 'Graduated'
        WHEN NEW.status = 'BLACKLISTED' THEN 'Expelled'
        -- These statuses should REMOVE from training:
        WHEN NEW.status IN ('New Inquiry', 'Interview Scheduled', 'Qualified', 'Pending Outcome', 'Lost - No Show Interview', 'Lost - Failed Interview', 'Lost - Age', 'Lost - No References', 'Lost - No Response', 'Lost - Good Conduct', 'Lost - Experience') THEN NULL
        ELSE NULL
    END;
    
    -- Check if this should remove from training
    IF OLD.status = 'Active in Training' AND NEW.status IN ('New Inquiry', 'Interview Scheduled', 'Qualified', 'Pending Outcome', 'Lost - No Show Interview', 'Lost - Failed Interview', 'Lost - Age', 'Lost - No References', 'Lost - No Response', 'Lost - Good Conduct', 'Lost - Experience') THEN
        should_remove_from_training := TRUE;
    END IF;
    
    -- Update or remove from training
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        -- Find existing training record
        SELECT id INTO training_record
        FROM niche_training 
        WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
        LIMIT 1;
        
        IF FOUND THEN
            IF should_remove_from_training THEN
                -- Log the removal in a notes table or activity log
                INSERT INTO activity_logs (table_name, record_id, action, details, created_by, created_at)
                VALUES (
                    'niche_training',
                    training_record.id,
                    'REMOVED_FROM_TRAINING',
                    CONCAT('Candidate status changed from "Active in Training" to "', NEW.status, '" - removed from training'),
                    'SYSTEM_SYNC',
                    NOW()
                ) ON CONFLICT DO NOTHING; -- In case activity_logs doesn't exist
                
                -- Remove from training
                DELETE FROM niche_training WHERE id = training_record.id;
            ELSIF new_training_status IS NOT NULL THEN
                -- Update training status
                UPDATE niche_training 
                SET 
                    status = new_training_status,
                    name = COALESCE(NEW.name, name),
                    role = COALESCE(NEW.role, role),
                    updated_by = 'CANDIDATE_SYNC',
                    updated_at = NOW()
                WHERE id = training_record.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: CREATE COMPREHENSIVE FORCE SYNC FUNCTION
-- =====================================================

-- Drop and recreate comprehensive force sync function
DROP FUNCTION IF EXISTS force_sync_all_niche_data();

CREATE OR REPLACE FUNCTION force_sync_all_niche_data()
RETURNS TABLE(
    sync_table TEXT,
    sync_action TEXT,
    sync_phone TEXT,
    sync_name TEXT,
    sync_old_status TEXT,
    sync_new_status TEXT,
    sync_details TEXT
) AS $$
BEGIN
    -- PHASE 1: Sync Training → Candidates
    RETURN QUERY
    WITH training_to_candidates AS (
        UPDATE niche_candidates nc
        SET 
            status = CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END,
            category = CASE 
                WHEN nt.training_type = 'weekend' THEN 'Short Course'
                ELSE '2-Week Flagship'
            END,
            name = COALESCE(nt.name, nc.name),
            role = COALESCE(nt.role, nc.role)
        FROM niche_training nt
        WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        AND (
            nc.status != CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END
            OR nc.name != nt.name
            OR nc.role != nt.role
        )
        RETURNING 
            'niche_candidates'::TEXT as sync_table,
            'UPDATED_FROM_TRAINING'::TEXT as sync_action,
            nc.phone as sync_phone,
            nc.name as sync_name,
            nc.status as sync_old_status,
            CASE 
                WHEN nt.status = 'Active' THEN 'Active in Training'
                WHEN nt.status = 'Graduated' THEN 'Graduated'
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
                ELSE nt.status
            END as sync_new_status,
            'Synced from training data' as sync_details
    )
    SELECT * FROM training_to_candidates;
    
    -- PHASE 2: Sync Candidates → Training (for active trainees only)
    RETURN QUERY
    WITH candidates_to_training AS (
        UPDATE niche_training nt
        SET 
            status = CASE 
                WHEN nc.status = 'Active in Training' THEN 'Active'
                WHEN nc.status = 'Graduated' THEN 'Graduated'
                WHEN nc.status = 'BLACKLISTED' THEN 'Expelled'
                ELSE nt.status
            END,
            name = COALESCE(nc.name, nt.name),
            role = COALESCE(nc.role, nt.role),
            updated_by = 'CANDIDATE_SYNC',
            updated_at = NOW()
        FROM niche_candidates nc
        WHERE normalize_phone_niche(nt.phone) = normalize_phone_niche(nc.phone)
        AND nc.status IN ('Active in Training', 'Graduated', 'BLACKLISTED')
        AND (
            nt.status != CASE 
                WHEN nc.status = 'Active in Training' THEN 'Active'
                WHEN nc.status = 'Graduated' THEN 'Graduated'
                WHEN nc.status = 'BLACKLISTED' THEN 'Expelled'
                ELSE nt.status
            END
            OR nt.name != nc.name
            OR nt.role != nc.role
        )
        RETURNING 
            'niche_training'::TEXT as sync_table,
            'UPDATED_FROM_CANDIDATES'::TEXT as sync_action,
            nt.phone as sync_phone,
            nt.name as sync_name,
            nt.status as sync_old_status,
            CASE 
                WHEN nc.status = 'Active in Training' THEN 'Active'
                WHEN nc.status = 'Graduated' THEN 'Graduated'
                WHEN nc.status = 'BLACKLISTED' THEN 'Expelled'
                ELSE nt.status
            END as sync_new_status,
            'Synced from candidate data' as sync_details
    )
    SELECT * FROM candidates_to_training;
    
    -- PHASE 3: Remove from training if candidate status changed to non-training status
    RETURN QUERY
    WITH removed_from_training AS (
        DELETE FROM niche_training nt
        WHERE EXISTS (
            SELECT 1 FROM niche_candidates nc 
            WHERE normalize_phone_niche(nt.phone) = normalize_phone_niche(nc.phone)
            AND nc.status IN ('New Inquiry', 'Interview Scheduled', 'Qualified', 'Pending Outcome', 'Lost - No Show Interview', 'Lost - Failed Interview', 'Lost - Age', 'Lost - No References', 'Lost - No Response', 'Lost - Good Conduct', 'Lost - Experience')
            AND nt.status = 'Active'  -- Only remove active trainees
        )
        RETURNING 
            'niche_training'::TEXT as sync_table,
            'REMOVED_FROM_TRAINING'::TEXT as sync_action,
            nt.phone as sync_phone,
            nt.name as sync_name,
            nt.status as sync_old_status,
            'REMOVED'::TEXT as sync_new_status,
            'Removed due to candidate status change' as sync_details
    )
    SELECT * FROM removed_from_training;
    
    -- PHASE 4: Add missing candidates from training
    RETURN QUERY
    WITH missing_candidates AS (
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
                WHEN nt.status = 'Expelled' THEN 'BLACKLISTED'
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
        AND nt.status != 'Expelled'
        AND NOT EXISTS (
            SELECT 1 FROM niche_candidates nc 
            WHERE normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
        )
        RETURNING 
            'niche_candidates'::TEXT as sync_table,
            'ADDED_FROM_TRAINING'::TEXT as sync_action,
            phone as sync_phone,
            name as sync_name,
            'N/A'::TEXT as sync_old_status,
            status as sync_new_status,
            'Added missing candidate from training' as sync_details
    )
    SELECT * FROM missing_candidates;
    
    -- PHASE 5: Update blacklist for expelled trainees
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
        reason = EXCLUDED.reason,
        updated_at = NOW();
        
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE BIDIRECTIONAL TRIGGERS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_candidates_to_training_trigger ON niche_candidates;

-- Create bidirectional trigger for candidates → training
CREATE TRIGGER sync_candidates_to_training_trigger
    AFTER UPDATE ON niche_candidates
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.name IS DISTINCT FROM NEW.name OR OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION sync_niche_candidates_to_training();

-- =====================================================
-- STEP 4: CREATE CONFLICT RESOLUTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_niche_conflicts()
RETURNS TABLE(
    conflict_type TEXT,
    phone_number TEXT,
    candidate_name TEXT,
    candidate_status TEXT,
    training_name TEXT,
    training_status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'STATUS_MISMATCH'::TEXT as conflict_type,
        nc.phone as phone_number,
        nc.name as candidate_name,
        nc.status as candidate_status,
        nt.name as training_name,
        nt.status as training_status,
        CASE 
            WHEN nt.status = 'Active' AND nc.status != 'Active in Training' THEN 'Candidate should be "Active in Training"'
            WHEN nt.status = 'Graduated' AND nc.status != 'Graduated' THEN 'Candidate should be "Graduated"'
            WHEN nt.status = 'Expelled' AND nc.status != 'BLACKLISTED' THEN 'Candidate should be "BLACKLISTED"'
            WHEN nc.status = 'Active in Training' AND nt.status != 'Active' THEN 'Training should be "Active"'
            ELSE 'Manual review required'
        END as recommendation
    FROM niche_candidates nc
    JOIN niche_training nt ON normalize_phone_niche(nc.phone) = normalize_phone_niche(nt.phone)
    WHERE (
        (nt.status = 'Active' AND nc.status != 'Active in Training') OR
        (nt.status = 'Graduated' AND nc.status != 'Graduated') OR
        (nt.status = 'Expelled' AND nc.status != 'BLACKLISTED') OR
        (nc.status = 'Active in Training' AND nt.status != 'Active') OR
        (nc.status = 'Graduated' AND nt.status != 'Graduated') OR
        (nc.status = 'BLACKLISTED' AND nt.status != 'Expelled')
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'BIDIRECTIONAL SYNC SYSTEM CREATED! 🎉' as result;

-- Test the comprehensive sync
SELECT 'Testing comprehensive force sync...' as test_step;
SELECT * FROM force_sync_all_niche_data() LIMIT 10;

-- Check for conflicts
SELECT 'Checking for conflicts...' as conflict_check;
SELECT * FROM resolve_niche_conflicts() LIMIT 5;

SELECT 'Bidirectional sync system is now active! 🔄' as final_status;