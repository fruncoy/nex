-- Fix sync_niche_candidates_to_training() to run with elevated permissions
-- so it can see and modify niche_training table
CREATE OR REPLACE FUNCTION sync_niche_candidates_to_training()
RETURNS TRIGGER 
SECURITY DEFINER  -- ← This is the key fix - run as function owner (postgres) not caller
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Also fix the blacklist sync function
CREATE OR REPLACE FUNCTION sync_niche_blacklist()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Your blacklist logic here (if any) - currently it just returns NEW
    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
