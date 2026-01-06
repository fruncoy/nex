-- Clean up existing SMS logs and improve status handling
DELETE FROM sms_logs WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- Add new status types
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS delivery_status TEXT,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2);

-- Update status enum to include more specific statuses
-- Note: Run this in Supabase SQL Editor