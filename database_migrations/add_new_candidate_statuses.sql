-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'candidates_status_check' 
               AND table_name = 'candidates') THEN
        ALTER TABLE candidates DROP CONSTRAINT candidates_status_check;
    END IF;
END $$;

-- Add constraint with all existing and new status values
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check 
CHECK (status IN (
    'PENDING', 
    'INTERVIEW_SCHEDULED', 
    'WON', 
    'LOST',
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