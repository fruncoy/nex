-- Drop and recreate cleanly (safe since no data yet)
DROP TABLE IF EXISTS sms_records CASCADE;
DROP TABLE IF EXISTS sms_campaigns CASCADE;

-- SMS Campaigns table
CREATE TABLE sms_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'graduation'
    CHECK (campaign_type IN ('graduation', 'weekly_digest', 'broadcast')),
  message TEXT NOT NULL,
  cohort_id UUID REFERENCES niche_cohorts(id),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  created_by TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Records table
CREATE TABLE sms_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add campaign_id to sms_logs if not exists
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES sms_campaigns(id);

-- Update message_type constraint
ALTER TABLE sms_logs DROP CONSTRAINT IF EXISTS sms_logs_message_type_check;
ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_message_type_check
  CHECK (message_type IN (
    'interview_reminder', 'welcome', 'notification',
    'bulk', 'graduation', 'weekly_digest', 'broadcast'
  ));

-- RLS
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage campaigns" ON sms_campaigns FOR ALL USING (true);
CREATE POLICY "Staff manage records" ON sms_records FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_sms_campaigns_type ON sms_campaigns(campaign_type);
CREATE INDEX idx_sms_campaigns_created ON sms_campaigns(created_at DESC);
CREATE INDEX idx_sms_records_campaign ON sms_records(campaign_id);
CREATE INDEX idx_sms_logs_campaign ON sms_logs(campaign_id);

-- Verify
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sms_campaigns' ORDER BY ordinal_position;
