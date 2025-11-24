-- Run this SQL in your Supabase SQL editor to create the placement management system

-- Drop existing tables if they exist
DROP TABLE IF EXISTS placement_followups CASCADE;
DROP TABLE IF EXISTS client_placements CASCADE;
DROP TABLE IF EXISTS placements CASCADE;

-- Create placements table
CREATE TABLE placements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    placement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUCCESS', 'LOST')),
    original_placement_id UUID REFERENCES placements(id) ON DELETE SET NULL,
    replacement_number INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Create placement_followups table
CREATE TABLE placement_followups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    placement_id UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    followup_type VARCHAR(20) NOT NULL CHECK (followup_type IN ('2_week', 'monthly')),
    due_date DATE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    issues TEXT,
    salary_paid BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Create indexes for better performance
CREATE INDEX idx_placements_candidate_id ON placements(candidate_id);
CREATE INDEX idx_placements_client_id ON placements(client_id);
CREATE INDEX idx_placements_original_id ON placements(original_placement_id);
CREATE INDEX idx_placement_followups_placement_id ON placement_followups(placement_id);
CREATE INDEX idx_placement_followups_due_date ON placement_followups(due_date);
CREATE INDEX idx_placement_followups_type ON placement_followups(followup_type);

-- Create function to auto-generate follow-ups when placement is created
CREATE OR REPLACE FUNCTION create_placement_followups()
RETURNS TRIGGER AS $$
BEGIN
    -- Create 2-week follow-ups for 3 months (6 follow-ups total)
    INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
    SELECT 
        NEW.id,
        '2_week',
        NEW.placement_date + (generate_series(1, 6) * INTERVAL '2 weeks')::DATE,
        NEW.created_by
    FROM generate_series(1, 6);
    
    -- Create monthly salary tracking for 3 months
    INSERT INTO placement_followups (placement_id, followup_type, due_date, created_by)
    SELECT 
        NEW.id,
        'monthly',
        DATE_TRUNC('month', NEW.placement_date + (generate_series(1, 3) * INTERVAL '1 month')) + INTERVAL '24 days',
        NEW.created_by
    FROM generate_series(1, 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate follow-ups
CREATE TRIGGER trigger_create_placement_followups
    AFTER INSERT ON placements
    FOR EACH ROW
    EXECUTE FUNCTION create_placement_followups();

-- Create function to auto-update placement status after 3 months
CREATE OR REPLACE FUNCTION update_placement_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update placement status to SUCCESS if all follow-ups are completed and 3 months have passed
    IF NEW.completed_date IS NOT NULL AND OLD.completed_date IS NULL THEN
        -- Check if this is the last follow-up for this placement
        IF NOT EXISTS (
            SELECT 1 FROM placement_followups 
            WHERE placement_id = NEW.placement_id 
            AND completed_date IS NULL
        ) THEN
            -- Check if 3 months have passed since placement date
            IF EXISTS (
                SELECT 1 FROM placements 
                WHERE id = NEW.placement_id 
                AND placement_date <= CURRENT_DATE - INTERVAL '3 months'
                AND status = 'ACTIVE'
            ) THEN
                UPDATE placements 
                SET status = 'SUCCESS', updated_at = NOW()
                WHERE id = NEW.placement_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update placement status
CREATE TRIGGER trigger_update_placement_status
    AFTER UPDATE ON placement_followups
    FOR EACH ROW
    EXECUTE FUNCTION update_placement_status();

-- Enable RLS
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_followups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for authenticated users" ON placements
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON placement_followups
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON placements TO authenticated;
GRANT ALL ON placement_followups TO authenticated;