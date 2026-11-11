-- Fix employment status values
-- Change "Available" to "Yet to be Employed"
-- Update sync functions to use correct status

-- 1. Update existing records
UPDATE newstaff_members
SET employment_status = 'Yet to be Employed'
WHERE employment_status = 'Available';

-- 2. Update the sync_graduates_to_staff function to use correct status
DROP FUNCTION IF EXISTS sync_graduates_to_staff();

CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  imported_count INT := 0;
  updated_count INT := 0;
  blacklisted_count INT := 0;
  total_count INT := 0;
  grad_record RECORD;
  existing_id UUID;
BEGIN
  -- First: Add blacklisted candidates who don't exist in newstaff_members
  INSERT INTO newstaff_members (
    name,
    phone,
    role,
    employment_status,
    signed_coc,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  SELECT 
    nc.name,
    nc.phone,
    COALESCE(nc.role, 'House Manager'),
    'Blacklisted',
    false,
    'GRADUATE_SYNC',
    'GRADUATE_SYNC',
    NOW(),
    NOW()
  FROM niche_candidates nc
  WHERE nc.status = 'BLACKLISTED'
    AND NOT EXISTS (
      SELECT 1 FROM newstaff_members sm 
      WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
    );
  
  GET DIAGNOSTICS blacklisted_count = ROW_COUNT;
  
  -- Second: Update any existing staff to Blacklisted status
  UPDATE newstaff_members sm
  SET
    employment_status = 'Blacklisted',
    updated_by = 'GRADUATE_SYNC',
    updated_at = NOW()
  FROM niche_candidates nc
  WHERE normalize_phone_niche(sm.phone) = normalize_phone_niche(nc.phone)
    AND nc.status = 'BLACKLISTED'
    AND sm.employment_status != 'Blacklisted';
  
  GET DIAGNOSTICS blacklisted_count = blacklisted_count + ROW_COUNT;
  
  -- Then: Sync graduated and expelled trainees
  FOR grad_record IN 
    SELECT DISTINCT 
      nt.name,
      nt.phone,
      nt.role,
      nt.cohort_id,
      nt.course,
      nt.status
    FROM niche_training nt
    WHERE nt.status IN ('Graduated', 'Expelled')
    ORDER BY nt.name
  LOOP
    total_count := total_count + 1;
    
    -- Check if already exists in newstaff_members by phone
    SELECT id INTO existing_id
    FROM newstaff_members
    WHERE phone = grad_record.phone
    LIMIT 1;
    
    IF existing_id IS NULL THEN
      -- Insert new staff member
      IF grad_record.status = 'Graduated' THEN
        INSERT INTO newstaff_members (
          name,
          phone,
          role,
          employment_status,
          signed_coc,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          grad_record.name,
          grad_record.phone,
          COALESCE(grad_record.role, 'House Manager'),
          'Yet to be Employed',  -- Changed from 'Available'
          false,
          'GRADUATE_SYNC',
          'GRADUATE_SYNC',
          NOW(),
          NOW()
        );
        imported_count := imported_count + 1;
      END IF;
      -- Note: Expelled people are NOT added to newstaff_members
      
    ELSE
      -- Update existing staff member
      IF grad_record.status = 'Expelled' THEN
        -- Mark as Blacklisted
        UPDATE newstaff_members
        SET
          employment_status = 'Blacklisted',
          updated_by = 'GRADUATE_SYNC',
          updated_at = NOW()
        WHERE id = existing_id
          AND employment_status != 'Blacklisted';
        
        IF FOUND THEN
          blacklisted_count := blacklisted_count + 1;
        END IF;
      ELSE
        -- Update status (preserve Employed status)
        UPDATE newstaff_members
        SET
          name = COALESCE(grad_record.name, name),
          role = COALESCE(grad_record.role, role),
          employment_status = CASE 
            WHEN employment_status = 'Employed' THEN employment_status
            ELSE 'Yet to be Employed'  -- Changed from 'Available'
          END,
          updated_by = 'GRADUATE_SYNC',
          updated_at = NOW()
        WHERE id = existing_id;
        
        updated_count := updated_count + 1;
      END IF;
    END IF;
    
    existing_id := NULL;
  END LOOP;
  
  RETURN json_build_object(
    'imported', imported_count,
    'updated', updated_count,
    'blacklisted', blacklisted_count,
    'total', total_count,
    'message', FORMAT('Synced %s trainees: %s new graduates, %s updated, %s blacklisted', 
                      total_count, imported_count, updated_count, blacklisted_count)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_graduates_to_staff() TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
