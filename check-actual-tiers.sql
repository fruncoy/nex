-- Check what tier names are actually used in the database
SELECT DISTINCT tier, COUNT(*) as count
FROM trainee_grades 
GROUP BY tier
ORDER BY count DESC;

-- Also check the original Cohort 3 data you provided to see what tiers were there
SELECT 
  id,
  final_score,
  tier,
  training_type
FROM trainee_grades 
WHERE cohort_id = '437b4d78-41bf-43dc-8e45-284a75635ff8'
ORDER BY final_score::numeric DESC;