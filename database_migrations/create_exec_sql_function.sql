-- Simple function to delete placement records
CREATE OR REPLACE FUNCTION force_delete_placement(placement_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete from related tables first
  DELETE FROM placement_activity_log WHERE placement_id = placement_id_param;
  DELETE FROM placement_followups WHERE placement_id = placement_id_param;
  
  -- Delete the main placement record
  DELETE FROM client_placements WHERE id = placement_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION force_delete_placement(UUID) TO authenticated;