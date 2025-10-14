-- Create function to safely delete placement with all related records
CREATE OR REPLACE FUNCTION delete_placement_cascade(placement_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete from placement_activity_log first
  DELETE FROM placement_activity_log WHERE placement_id = placement_id_param;
  
  -- Delete from placement_followups
  DELETE FROM placement_followups WHERE placement_id = placement_id_param;
  
  -- Finally delete the placement
  DELETE FROM client_placements WHERE id = placement_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_placement_cascade(UUID) TO authenticated;