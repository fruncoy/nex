-- Drop existing constraint
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_work_schedule_check;

-- Add new constraint with correct values
ALTER TABLE candidates ADD CONSTRAINT candidates_work_schedule_check 
CHECK (work_schedule IN ('Full Time', 'Part Time') OR work_schedule IS NULL);