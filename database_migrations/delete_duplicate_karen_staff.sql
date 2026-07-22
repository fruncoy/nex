-- Delete the duplicate Karen staff inserted WITHOUT cohort_label
-- Keeps the ones with cohort_label = 'Karen Cohort', removes the unlabelled duplicates

DELETE FROM newstaff_members
WHERE phone IN (
  '0797824720','0783596537','0728435078','0715173183','0115905560',
  '0720161524','0716393328','0720499983','0759322694','0711636604',
  '0798884359','0710355293','0740760898','0720344818','0710841483'
)
AND cohort_label IS NULL;
