-- Add missing fields to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS good_conduct_cert_receipt TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS apartment TEXT;