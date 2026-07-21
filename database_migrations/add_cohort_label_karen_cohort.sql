-- Step 1: Add cohort_label column for manually-added staff
ALTER TABLE newstaff_members ADD COLUMN IF NOT EXISTS cohort_label text;

-- Step 2: Insert Karen Cohort staff
-- If already inserted without cohort_label, run the UPDATE below instead
INSERT INTO newstaff_members (name, phone, role, employment_status, signed_coc, cohort_label, created_by, updated_by)
VALUES
  ('Violet Kimiya',    '0797824720', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Alice Arunda',     '0783596537', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Mercy Kyule',      '0728435078', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Angeline Simiyu',  '0715173183', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Caroline Wangeshi','0115905560', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Eunice Makungu',   '0720161524', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Judith Kerubo',    '0716393328', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Purity Ondede',    '0720499983', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Sandra Namusia',   '0759322694', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Teresiah Mwangi',  '0711636604', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Sarah Namoromeh',  '0798884359', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Yvonne Anyango',   '0710355293', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Lydia Okwanyo',    '0740760898', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Ruth Wang''are',   '0720344818', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System'),
  ('Jessica Rasigu',   '0710841483', 'House Manager', 'Employed', false, 'Karen Cohort', 'System', 'System');

-- NOTE: If you already ran insert_karen_cohort_staff.sql, run this instead of the INSERT above:
-- UPDATE newstaff_members
-- SET cohort_label = 'Karen Cohort'
-- WHERE phone IN (
--   '0797824720','0783596537','0728435078','0715173183','0115905560',
--   '0720161524','0716393328','0720499983','0759322694','0711636604',
--   '0798884359','0710355293','0740760898','0720344818','0710841483'
-- );
