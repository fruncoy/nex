-- Create niche_practical_assessments table for home appliance assessments
CREATE TABLE IF NOT EXISTS niche_practical_assessments (
    id SERIAL PRIMARY KEY,
    trainee_id UUID NOT NULL REFERENCES niche_training(id) ON DELETE CASCADE,
    assessment_week INTEGER NOT NULL CHECK (assessment_week IN (1, 2)),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Kitchen Equipment
    oven_score INTEGER CHECK (oven_score >= 1 AND oven_score <= 5),
    microwave_score INTEGER CHECK (microwave_score >= 1 AND microwave_score <= 5),
    coffee_maker_score INTEGER CHECK (coffee_maker_score >= 1 AND coffee_maker_score <= 5),
    sandwich_maker_score INTEGER CHECK (sandwich_maker_score >= 1 AND sandwich_maker_score <= 5),
    toaster_score INTEGER CHECK (toaster_score >= 1 AND toaster_score <= 5),
    fryer_score INTEGER CHECK (fryer_score >= 1 AND fryer_score <= 5),
    blender_score INTEGER CHECK (blender_score >= 1 AND blender_score <= 5),
    gas_cooker_score INTEGER CHECK (gas_cooker_score >= 1 AND gas_cooker_score <= 5),
    cylinder_score INTEGER CHECK (cylinder_score >= 1 AND cylinder_score <= 5),
    
    -- Refrigeration Equipment
    fridge_score INTEGER CHECK (fridge_score >= 1 AND fridge_score <= 5),
    freezer_score INTEGER CHECK (freezer_score >= 1 AND freezer_score <= 5),
    water_purifier_score INTEGER CHECK (water_purifier_score >= 1 AND water_purifier_score <= 5),
    water_dispensers_score INTEGER CHECK (water_dispensers_score >= 1 AND water_dispensers_score <= 5),
    
    -- Laundry & Cleaning Equipment
    washing_machines_score INTEGER CHECK (washing_machines_score >= 1 AND washing_machines_score <= 5),
    vacuum_cleaner_score INTEGER CHECK (vacuum_cleaner_score >= 1 AND vacuum_cleaner_score <= 5),
    dishwasher_score INTEGER CHECK (dishwasher_score >= 1 AND dishwasher_score <= 5),
    
    -- Floor Care Equipment
    polishing_machine_score INTEGER CHECK (polishing_machine_score >= 1 AND polishing_machine_score <= 5),
    floor_scrubber_score INTEGER CHECK (floor_scrubber_score >= 1 AND floor_scrubber_score <= 5),
    steam_vapour_machine_score INTEGER CHECK (steam_vapour_machine_score >= 1 AND steam_vapour_machine_score <= 5),
    floor_polisher_score INTEGER CHECK (floor_polisher_score >= 1 AND floor_polisher_score <= 5),
    carpet_shampooer_score INTEGER CHECK (carpet_shampooer_score >= 1 AND carpet_shampooer_score <= 5),
    bed_vacuum_score INTEGER CHECK (bed_vacuum_score >= 1 AND bed_vacuum_score <= 5),
    
    -- Overall score (calculated automatically)
    overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 5),
    
    -- Metadata
    assessed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate assessments
    UNIQUE(trainee_id, assessment_week)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_niche_practical_assessments_trainee_week 
ON niche_practical_assessments(trainee_id, assessment_week);

-- Create index for assessment date queries
CREATE INDEX IF NOT EXISTS idx_niche_practical_assessments_date 
ON niche_practical_assessments(assessment_date);

-- Enable Row Level Security
ALTER TABLE niche_practical_assessments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON niche_practical_assessments
    FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_niche_practical_assessments_updated_at 
    BEFORE UPDATE ON niche_practical_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();