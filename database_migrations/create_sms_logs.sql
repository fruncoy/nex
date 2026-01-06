-- Create SMS logs table for tracking all SMS communications
CREATE TABLE sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type VARCHAR NOT NULL, -- 'candidate', 'staff', 'client'
  recipient_id UUID,
  recipient_name VARCHAR NOT NULL,
  phone_number VARCHAR NOT NULL,
  message_type VARCHAR NOT NULL, -- 'interview_reminder', 'welcome', 'notification', 'bulk'
  message_content TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  api_response TEXT,
  message_id VARCHAR, -- TextSMS messageid for delivery reports
  network_id VARCHAR, -- TextSMS networkid
  response_code INTEGER, -- 200, 1001, 1004, etc.
  retry_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES staff(id),
  sent_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for staff to manage SMS logs
CREATE POLICY "Staff can manage SMS logs" ON sms_logs
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_sms_logs_recipient ON sms_logs(recipient_type, recipient_id);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX idx_sms_logs_message_type ON sms_logs(message_type);