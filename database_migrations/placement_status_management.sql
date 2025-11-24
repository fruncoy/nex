-- Create functions to manage placement status changes and auto-complete followups

-- Function to auto-complete all followups when placement is marked as SUCCESS
CREATE OR REPLACE FUNCTION auto_complete_followups_on_success()
RETURNS TRIGGER AS $$
BEGIN
  -- If placement status changed to SUCCESS, complete all incomplete followups
  IF NEW.status = 'SUCCESS' AND OLD.status != 'SUCCESS' THEN
    UPDATE placement_followups 
    SET 
      completed_date = NOW(),
      satisfaction_rating = 5,
      issues = 'All Good',
      completed_by_username = 'System'
    WHERE placement_id = NEW.id 
    AND followup_type = '2_week'
    AND completed_date IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-completing followups on SUCCESS
DROP TRIGGER IF EXISTS trigger_auto_complete_followups ON placements;
CREATE TRIGGER trigger_auto_complete_followups
    AFTER UPDATE ON placements
    FOR EACH ROW
    EXECUTE FUNCTION auto_complete_followups_on_success();

-- Function to update placement status based on followup completion
CREATE OR REPLACE FUNCTION update_placement_status_on_followup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all 6 followups are completed
  IF (
    SELECT COUNT(*) FROM placement_followups 
    WHERE placement_id = NEW.placement_id 
    AND followup_type = '2_week'
    AND completed_date IS NOT NULL
  ) = 6 THEN
    -- Mark placement as SUCCESS
    UPDATE placements 
    SET status = 'SUCCESS', updated_at = NOW()
    WHERE id = NEW.placement_id AND status = 'ACTIVE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating placement status
DROP TRIGGER IF EXISTS trigger_update_placement_status ON placement_followups;
CREATE TRIGGER trigger_update_placement_status
    AFTER UPDATE ON placement_followups
    FOR EACH ROW
    WHEN (NEW.completed_date IS NOT NULL AND OLD.completed_date IS NULL AND NEW.followup_type = '2_week')
    EXECUTE FUNCTION update_placement_status_on_followup();

-- Update existing placements to SUCCESS if they have all 6 followups completed
UPDATE placements 
SET status = 'SUCCESS', updated_at = NOW()
WHERE status = 'ACTIVE' 
AND id IN (
  SELECT placement_id 
  FROM placement_followups 
  WHERE followup_type = '2_week'
  AND completed_date IS NOT NULL
  GROUP BY placement_id 
  HAVING COUNT(*) = 6
);