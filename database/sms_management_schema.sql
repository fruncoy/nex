-- SMS Campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    cohort_id UUID REFERENCES niche_cohorts(id) ON DELETE CASCADE,
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL
);

-- SMS Records table (individual message tracking)
CREATE TABLE IF NOT EXISTS sms_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_cohort_id ON sms_campaigns(cohort_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_at ON sms_campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_sms_records_campaign_id ON sms_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_records_status ON sms_records(status);
CREATE INDEX IF NOT EXISTS idx_sms_records_recipient_phone ON sms_records(recipient_phone);

-- Row Level Security
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
CREATE POLICY "Allow authenticated users to view SMS campaigns" ON sms_campaigns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create SMS campaigns" ON sms_campaigns
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update SMS campaigns" ON sms_campaigns
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view SMS records" ON sms_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create SMS records" ON sms_records
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update SMS records" ON sms_records
    FOR UPDATE USING (auth.role() = 'authenticated');