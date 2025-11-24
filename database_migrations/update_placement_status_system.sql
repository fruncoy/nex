-- Update placement status system to include LOST and SUCCESS statuses

-- Update placement status constraint to include new statuses
ALTER TABLE placements DROP CONSTRAINT IF EXISTS placements_status_check;
ALTER TABLE placements ADD CONSTRAINT placements_status_check 
CHECK (status IN ('ACTIVE', 'SUCCESS', 'LOST'));

-- Update placement_followups to store staff username instead of ID
ALTER TABLE placement_followups ADD COLUMN IF NOT EXISTS completed_by_username VARCHAR(100);

-- Create function to automatically mark placement as SUCCESS when all followups completed
CREATE OR REPLACE FUNCTION check_placement_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all followups for this placement are completed
  IF NOT EXISTS (
    SELECT 1 FROM placement_followups 
    WHERE placement_id = NEW.placement_id 
    AND completed_date IS NULL
  ) THEN
    -- Mark placement as SUCCESS
    UPDATE placements 
    SET status = 'SUCCESS', updated_at = NOW()
    WHERE id = NEW.placement_id AND status = 'ACTIVE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-completion
DROP TRIGGER IF EXISTS trigger_check_placement_completion ON placement_followups;
CREATE TRIGGER trigger_check_placement_completion
    AFTER UPDATE ON placement_followups
    FOR EACH ROW
    WHEN (NEW.completed_date IS NOT NULL AND OLD.completed_date IS NULL)
    EXECUTE FUNCTION check_placement_completion();