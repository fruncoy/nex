-- Check existing statuses first
SELECT DISTINCT status FROM candidates ORDER BY status;

-- Drop existing constraint
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;

-- Add new constraint with all existing statuses plus new ones
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check 
CHECK (status IN (
    'PENDING', 
    'INTERVIEW_SCHEDULED', 
    'WON',
    'LOST',
    'Lost - Interview Lost',
    'Lost - Missed Interview',
    'Lost, Age', 
    'Lost, No References', 
    'Lost, No Response', 
    'Lost, Personality', 
    'Lost, Salary', 
    'Lost, Experience', 
    'Lost, No Good Conduct', 
    'Pending, applying GC', 
    'BLACKLISTED',
    'ARCHIVED'
));