-- Check what triggers exist on client_placements
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'client_placements';

-- Create a function that temporarily drops the foreign key constraint
CREATE OR REPLACE FUNCTION delete_placement_safe(placement_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Drop the foreign key constraint temporarily
  ALTER TABLE placement_activity_log DROP CONSTRAINT IF EXISTS placement_activity_log_placement_id_fkey;
  
  -- Delete from related tables
  DELETE FROM placement_activity_log WHERE placement_id = placement_id_param;
  DELETE FROM placement_followups WHERE placement_id = placement_id_param;
  
  -- Delete the main placement record
  DELETE FROM client_placements WHERE id = placement_id_param;
  
  -- Recreate the foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'placement_activity_log_placement_id_fkey'
  ) THEN
    ALTER TABLE placement_activity_log 
    ADD CONSTRAINT placement_activity_log_placement_id_fkey 
    FOREIGN KEY (placement_id) REFERENCES client_placements(id);
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to recreate constraint even if there's an error
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'placement_activity_log_placement_id_fkey'
    ) THEN
      ALTER TABLE placement_activity_log 
      ADD CONSTRAINT placement_activity_log_placement_id_fkey 
      FOREIGN KEY (placement_id) REFERENCES client_placements(id);
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_placement_safe(UUID) TO authenticated;