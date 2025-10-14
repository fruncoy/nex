-- Drop the existing foreign key constraint
ALTER TABLE placement_activity_log 
DROP CONSTRAINT IF EXISTS placement_activity_log_placement_id_fkey;

-- Recreate it with CASCADE DELETE
ALTER TABLE placement_activity_log 
ADD CONSTRAINT placement_activity_log_placement_id_fkey 
FOREIGN KEY (placement_id) REFERENCES client_placements(id) ON DELETE CASCADE;