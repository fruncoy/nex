-- Create niche_timetable table for weekly schedules
CREATE TABLE IF NOT EXISTS niche_timetable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  time_slot TEXT NOT NULL,
  activity TEXT NOT NULL,
  course_type TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_number, day_of_week, time_slot)
);

-- Insert Week 1 timetable
INSERT INTO niche_timetable (week_number, day_of_week, time_slot, activity, course_type) VALUES
-- Monday Week 1
(1, 'Monday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Monday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Monday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Monday', '8:00am - 10:00am', 'Industry overview rules and regulations (by-laws), professional work ethics and communication, Personal hygiene and safety in homes, work plan schedules, Routine tasks', 'Theory'),
(1, 'Monday', '10:00am - 10:30am', 'BREAK TIME', 'Break'),
(1, 'Monday', '10:30am - 1:00pm', 'Housekeeping principles, Use of Cleaning appliances and maintenance, cleaning solutions and safety.', 'Theory'),
(1, 'Monday', '1:00pm - 2:00pm', 'LUNCH BREAK', 'Break'),
(1, 'Monday', '2:00pm - 3:00pm', 'Cleaning standards and procedures (dinning, lobby, washrooms and balconies, Types of furnitures and their maintenance, organizations systems.', 'Theory'),
(1, 'Monday', '3:00pm - 5:00pm', 'Laundry procedures and fabric maintenance (sorting, soaking, stain removal, washing, spinning wringing, hanging, ironing and folding.', 'Theory'),
(1, 'Monday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Monday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Monday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Monday', '9:00pm', 'BED TIME!!', 'General'),

-- Tuesday Week 1
(1, 'Tuesday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Tuesday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Tuesday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Tuesday', '8:00am - 10:00am', 'Child care routines: - Bathing & grooming, feeding & storage, Diapering & disposal, playing routines, Safe sleeping and napping, potty training & hygiene.', 'Childcare'),
(1, 'Tuesday', '10:00am - 10:30am', 'BREAK TIME', 'Break'),
(1, 'Tuesday', '10:30am - 1:00pm', 'Child Nutrition, classification of nutrients, their sources and benefits, Meal plan, shopping list, storage systems for raw food materials, food preparation, cooking and presentation.', 'Childcare'),
(1, 'Tuesday', '1:00pm - 2:00pm', 'LUNCH TIME', 'Break'),
(1, 'Tuesday', '2:00pm - 3:00pm', 'Meal plan for a Toddler, preparation, cooking, presentation feeding, storage and hygiene, utensils cleaning & sanitization', 'Childcare'),
(1, 'Tuesday', '3:00pm - 5:00pm', 'Food contamination zones', 'Theory'),
(1, 'Tuesday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Tuesday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Tuesday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Tuesday', '9:00pm', 'BED TIME!!', 'General'),

-- Wednesday Week 1
(1, 'Wednesday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Wednesday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Wednesday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Wednesday', '8:00am - 10:00am', 'WELLIVIA PRACTICALS - Cleaning test for hygiene and safety - Cleaning living areas i.e. lobby, sitting and table rooms and bedrooms - Demonstrating cleaning procedures on floors, walls, ceilings and furnitures - Room organization - Washroom cleaning procedure and waste management', 'Practical'),
(1, 'Wednesday', '10:30am - 1:00pm', '', 'Practical'),
(1, 'Wednesday', '1:00pm - 2:00pm', '', 'Break'),
(1, 'Wednesday', '2:00pm - 3:00pm', '', 'Practical'),
(1, 'Wednesday', '3:00pm - 5:00pm', 'Kitchen appliances, cleaning and maintenance i.e. cooker and fridge', 'Practical'),
(1, 'Wednesday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Wednesday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Wednesday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Wednesday', '9:00pm', 'BED TIME!!', 'General'),

-- Thursday Week 1
(1, 'Thursday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Thursday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Thursday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Thursday', '8:00am - 10:00am', 'Wardrobe and cabinet maintenance', 'Theory'),
(1, 'Thursday', '10:30am - 1:00pm', 'Window, doors and balconies cleaning', 'Practical'),
(1, 'Thursday', '1:00pm - 2:00pm', '', 'Break'),
(1, 'Thursday', '2:00pm - 3:00pm', 'How to handle mistakes', 'Theory'),
(1, 'Thursday', '3:00pm - 5:00pm', 'Etiquette, Communication, Personal Presentation & Professionalism', 'Theory'),
(1, 'Thursday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Thursday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Thursday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Thursday', '9:00pm', 'BED TIME!!', 'General'),

-- Friday Week 1
(1, 'Friday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Friday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Friday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Friday', '8:00am - 10:00am', 'Food Safety Standards', 'Theory'),
(1, 'Friday', '10:30am - 1:00pm', 'Work Planning & Home Management', 'Theory'),
(1, 'Friday', '2:00pm - 3:00pm', 'How to Manage Conflicting instructions', 'Theory'),
(1, 'Friday', '3:00pm - 5:00pm', 'First Aid', 'Theory'),

-- Saturday Week 1
(1, 'Saturday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Saturday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Saturday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Saturday', '8:00am - 10:00am', 'WEEKEND HOUSEKEEPING Laundry (machine procedures), fabric care, ironing and stain removal.', 'Practical'),
(1, 'Saturday', '10:30am - 1:00pm', 'WEEKEND HOUSEKEEPING Shoe care and maintenance', 'Practical'),
(1, 'Saturday', '2:00pm - 3:00pm', 'Specialized Childcare Support', 'Childcare'),
(1, 'Saturday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Saturday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Saturday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Saturday', '9:00pm', 'BED TIME!!', 'General'),

-- Sunday Week 1
(1, 'Sunday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(1, 'Sunday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(1, 'Sunday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(1, 'Sunday', '8:00am - 10:00am', 'DEVOTION & FREE TIME', 'General'),
(1, 'Sunday', '1:00pm - 2:00pm', 'COOKING CLASS', 'Practical'),
(1, 'Sunday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(1, 'Sunday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(1, 'Sunday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(1, 'Sunday', '9:00pm', 'BED TIME!!', 'General');

-- Insert Week 2 timetable
INSERT INTO niche_timetable (week_number, day_of_week, time_slot, activity, course_type) VALUES
-- Monday Week 2
(2, 'Monday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Monday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Monday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Monday', '8:00am - 10:00am', 'Nutrition & Balanced Diet', 'Theory'),
(2, 'Monday', '10:00am - 10:30am', 'BREAK TIME', 'Break'),
(2, 'Monday', '10:30am - 1:00pm', 'Pet care', 'Theory'),
(2, 'Monday', '1:00pm - 2:00pm', 'LUNCH BREAK', 'Break'),
(2, 'Monday', '2:00pm - 3:00pm', 'Taking corrections & Emotional Control', 'Theory'),
(2, 'Monday', '3:00pm - 5:00pm', 'Child care and family sensitive housekeeping i.e. cleaning around kids, elderly and pets. Handling electronic appliances safety. Water safety.', 'Childcare'),
(2, 'Monday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Monday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Monday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Monday', '9:00pm', 'BED TIME!!', 'General'),

-- Tuesday Week 2
(2, 'Tuesday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Tuesday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Tuesday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Tuesday', '8:00am - 10:00am', 'Child care routines: - Bathing & grooming, feeding & storage, Diapering & disposal, playing routines, Safe sleeping and napping, potty training & hygiene.', 'Childcare'),
(2, 'Tuesday', '10:00am - 10:30am', 'BREAK TIME', 'Break'),
(2, 'Tuesday', '10:30am - 1:00pm', 'Child care; practical Bottle feeding and formulae Weaning meal plan', 'Childcare'),
(2, 'Tuesday', '1:00pm - 2:00pm', 'LUNCH TIME', 'Break'),
(2, 'Tuesday', '2:00pm - 3:00pm', 'Practical; baby food preparation, cooking, presentation and storage', 'Childcare'),
(2, 'Tuesday', '3:00pm - 5:00pm', 'Child care; practical Feeding procedures and safety.', 'Childcare'),
(2, 'Tuesday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Tuesday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Tuesday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Tuesday', '9:00pm', 'BED TIME!!', 'General'),

-- Wednesday Week 2
(2, 'Wednesday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Wednesday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Wednesday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Wednesday', '8:00am - 10:00am', 'WELLIVIA PRACTICALS - Cleaning test for hygiene and safety - Cleaning living areas i.e. lobby, sitting and table rooms and bedrooms - Demonstrating cleaning procedures on floors, walls, ceilings and furnitures - Room organization - Washroom cleaning procedure and waste management', 'Practical'),
(2, 'Wednesday', '2:00pm - 3:00pm', 'Professional silence and restraint', 'Theory'),
(2, 'Wednesday', '3:00pm - 5:00pm', 'Playing with Children & dealing with emotional meltdowns', 'Childcare'),
(2, 'Wednesday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Wednesday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Wednesday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Wednesday', '9:00pm', 'BED TIME!!', 'General'),

-- Thursday Week 2
(2, 'Thursday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Thursday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Thursday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Thursday', '8:00am - 10:00am', 'Work Planning & Home Management', 'Theory'),
(2, 'Thursday', '10:30am - 1:00pm', 'Laundry procedures and fabric maintenance (sorting, soaking, stain removal, washing, spinning wringing, hanging, ironing and folding.', 'Practical'),
(2, 'Thursday', '2:00pm - 3:00pm', 'Personal brand in domestic work', 'Theory'),
(2, 'Thursday', '3:00pm - 5:00pm', 'Handling dissatisfaction gracefully & Working with difficult employers', 'Theory'),
(2, 'Thursday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Thursday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Thursday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Thursday', '9:00pm', 'BED TIME!!', 'General'),

-- Friday Week 2
(2, 'Friday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Friday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Friday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Friday', '8:00am - 10:00am', 'Food Storage Standards', 'Theory'),
(2, 'Friday', '10:30am - 1:00pm', 'Etiquette, Communication, Personal Presentation & Professionalism', 'Theory'),
(2, 'Friday', '2:00pm - 3:00pm', 'Digital communication and privacy', 'Theory'),
(2, 'Friday', '3:00pm - 5:00pm', 'Inventory management & forecasting', 'Theory'),

-- Saturday Week 2
(2, 'Saturday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Saturday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Saturday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Saturday', '8:00am - 10:00am', 'FIRST FOODS DONE RIGHT', 'Childcare'),
(2, 'Saturday', '2:00pm - 3:00pm', 'Specialized Childcare Support', 'Childcare'),
(2, 'Saturday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Saturday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Saturday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Saturday', '9:00pm', 'BED TIME!!', 'General'),

-- Sunday Week 2
(2, 'Sunday', '4:30am - 6:00am', 'Personal grooming and general cleaning.', 'General'),
(2, 'Sunday', '6:00am - 7:30am', 'Breakfast prep and presentation.', 'General'),
(2, 'Sunday', '7:30am - 8:00am', 'General inspection, call register and touch-ups.', 'General'),
(2, 'Sunday', '8:00am - 10:00am', 'DEVOTION & FREE TIME', 'General'),
(2, 'Sunday', '1:00pm - 2:00pm', 'COOKING CLASS & GRADUATION', 'Practical'),
(2, 'Sunday', '5:00pm - 6:30pm', 'Supper preparation, Serving and utensils cleaning.', 'General'),
(2, 'Sunday', '6:30pm - 7:30pm', 'Hygiene practices (shower time)', 'General'),
(2, 'Sunday', '7:30pm - 9:00pm', 'Evening services (call register, duty planning and closing psalms.', 'General'),
(2, 'Sunday', '9:00pm', 'BED TIME!!', 'General');

-- Create indexes for performance
CREATE INDEX idx_niche_timetable_week ON niche_timetable(week_number);
CREATE INDEX idx_niche_timetable_day ON niche_timetable(day_of_week);
CREATE INDEX idx_niche_timetable_course_type ON niche_timetable(course_type);
CREATE INDEX idx_niche_timetable_active ON niche_timetable(is_active);

-- Enable RLS
ALTER TABLE niche_timetable ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read timetable" ON niche_timetable
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage timetable" ON niche_timetable
  FOR ALL TO authenticated USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_niche_timetable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER niche_timetable_updated_at
  BEFORE UPDATE ON niche_timetable
  FOR EACH ROW
  EXECUTE FUNCTION update_niche_timetable_updated_at();