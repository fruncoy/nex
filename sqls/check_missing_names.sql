-- Check if the missing candidates exist in niche_training table
SELECT nt.name, nc.cohort_number, nt.id as trainee_id, nc.id as cohort_id
FROM niche_training nt 
JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
WHERE nt.name IN ('Emily Gatabi', 'Gentrix Lusinde Mwori');

-- Check all names in cohort 1
SELECT nt.name, nc.cohort_number 
FROM niche_training nt 
JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
WHERE nc.cohort_number = 1;

-- Check all names in cohort 2  
SELECT nt.name, nc.cohort_number 
FROM niche_training nt 
JOIN niche_cohorts nc ON nt.cohort_id = nc.id 
WHERE nc.cohort_number = 2;