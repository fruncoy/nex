-- Add exclude_from_sms column to sms_contacts table
ALTER TABLE sms_contacts 
ADD COLUMN IF NOT EXISTS exclude_from_sms BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN sms_contacts.exclude_from_sms IS 'When true, this contact is excluded from SMS campaigns when Select All is used';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_sms_contacts_exclude ON sms_contacts(exclude_from_sms);
