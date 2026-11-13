-- Create sync_graduates_to_staff RPC function
-- Syncs graduated trainees from niche_training to newstaff_members

CREATE OR REPLACE FUNCTION sync_graduates_to_staff()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  imported_count INT := 0;
  updated_count INT := 0;
  total_count INT := 0;
  grad_record RECORD;
  existing_id UUID;
BEGIN
  -- Find all graduated trainees
  FOR grad_record IN 
    SELECT DISTINCT 
      nt.name,
      nt.phone,
      nt.role,
      nt.cohort_id,
      nt.course
    FROM niche_training nt
    WHERE nt.status = 'Graduated'
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
        'Available',
        false,
        'GRADUATE_SYNC',
        'GRADUATE_SYNC',
        NOW(),
        NOW()
      );
      
      imported_count := imported_count + 1;
    ELSE
      -- Update existing staff member
      UPDATE newstaff_members
      SET
        name = COALESCE(grad_record.name, name),
        role = COALESCE(grad_record.role, role),
        employment_status = CASE 
          WHEN employment_status = 'Employed' THEN employment_status
          ELSE 'Available'
        END,
        updated_by = 'GRADUATE_SYNC',
        updated_at = NOW()
      WHERE id = existing_id;
      
      updated_count := updated_count + 1;
    END IF;
    
    existing_id := NULL;
  END LOOP;
  
  RETURN json_build_object(
    'imported', imported_count,
    'updated', updated_count,
    'total', total_count,
    'message', FORMAT('Synced %s graduates: %s new, %s updated', 
                      total_count, imported_count, updated_count)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_graduates_to_staff() TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
