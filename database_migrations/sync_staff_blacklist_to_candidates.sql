-- Sync Staff Blacklist to NICHE Candidates
-- When a staff member's employment status is set to BLACKLISTED, update the corresponding niche_candidate

BEGIN;

-- Function to sync staff blacklist status to niche_candidates
CREATE OR REPLACE FUNCTION sync_staff_blacklist_to_candidates()
RETURNS TRIGGER AS $$
DECLARE
    v_training_record RECORD;
    v_candidate_record RECORD;
BEGIN
    -- If employment status is changed to BLACKLISTED
    IF NEW.employment_status = 'BLACKLISTED' AND (OLD.employment_status IS NULL OR OLD.employment_status != 'BLACKLISTED') THEN
        -- Get the associated niche_training record
        IF NEW.niche_training_id IS NOT NULL THEN
            SELECT * INTO v_training_record
            FROM niche_training
            WHERE id = NEW.niche_training_id;
            
            IF FOUND AND v_training_record.phone IS NOT NULL AND v_training_record.phone != '' THEN
                -- Find the corresponding niche_candidate by normalized phone
                SELECT * INTO v_candidate_record
                FROM niche_candidates
                WHERE normalize_phone_niche(phone) = normalize_phone_niche(v_training_record.phone)
                LIMIT 1;
                
                IF FOUND THEN
                    -- Update candidate status to BLACKLISTED
                    UPDATE niche_candidates
                    SET status = 'BLACKLISTED'
                    WHERE id = v_candidate_record.id;
                    
                    -- Also add to blacklist table
                    INSERT INTO blacklist (name, phone, reason, created_by, created_at)
                    VALUES (
                        NEW.name,
                        normalize_phone_niche(v_training_record.phone),
                        'Blacklisted from Staff Management',
                        COALESCE(NEW.updated_by, 'SYSTEM'),
                        NOW()
                    )
                    ON CONFLICT (phone) DO UPDATE SET
                        reason = 'Blacklisted from Staff Management',
                        updated_at = NOW();
                END IF;
            END IF;
        ELSE
            -- If no niche_training_id, try to find by staff's phone directly
            IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
                SELECT * INTO v_candidate_record
                FROM niche_candidates
                WHERE normalize_phone_niche(phone) = normalize_phone_niche(NEW.phone)
                LIMIT 1;
                
                IF FOUND THEN
                    -- Update candidate status to BLACKLISTED
                    UPDATE niche_candidates
                    SET status = 'BLACKLISTED'
                    WHERE id = v_candidate_record.id;
                    
                    -- Also add to blacklist table
                    INSERT INTO blacklist (name, phone, reason, created_by, created_at)
                    VALUES (
                        NEW.name,
                        normalize_phone_niche(NEW.phone),
                        'Blacklisted from Staff Management',
                        COALESCE(NEW.updated_by, 'SYSTEM'),
                        NOW()
                    )
                    ON CONFLICT (phone) DO UPDATE SET
                        reason = 'Blacklisted from Staff Management',
                        updated_at = NOW();
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_staff_blacklist_trigger ON newstaff_members;

-- Create trigger to fire on update of newstaff_members
CREATE TRIGGER sync_staff_blacklist_trigger
    AFTER UPDATE ON newstaff_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_staff_blacklist_to_candidates();

COMMIT;
