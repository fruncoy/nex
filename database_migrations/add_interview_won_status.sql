-- Add 'WON - Interview Won' to the candidates status constraint
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;

ALTER TABLE candidates ADD CONSTRAINT candidates_status_check 
CHECK (status IN (
    'PENDING', 
    'INTERVIEW_SCHEDULED', 
    'WON',
    'WON - Interview Won',
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