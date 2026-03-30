-- Add reminder_date column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP;

-- Add reminder_date column to candidates table if not exists
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP;

-- Add meeting notes status functionality
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS completed_by VARCHAR(255);