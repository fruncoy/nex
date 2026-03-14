-- Verify all three cohorts are properly fixed
SELECT 
  c.cohort_number,
  tg.cohort_id,
  tg.training_type,
  COUNT(*) as record_count,
  MIN(tg.final_score::numeric) as min_score,
  MAX(tg.final_score::numeric) as max_score,
  AVG(tg.final_score::numeric) as avg_score
FROM trainee_grades tg
LEFT JOIN niche_cohorts c ON tg.cohort_id = c.id
GROUP BY c.cohort_number, tg.cohort_id, tg.training_type
ORDER BY c.cohort_number, tg.training_type;

-- Show detailed view of all records to confirm scoring
SELECT 
  c.cohort_number,
  tg.training_type,
  tg.pillar1_score,
  tg.pillar2_score,
  tg.pillar3_score,
  tg.pillar4_score,
  tg.final_score,
  tg.tier
FROM trainee_grades tg
LEFT JOIN niche_cohorts c ON tg.cohort_id = c.id
ORDER BY c.cohort_number, tg.training_type, tg.final_score::numeric DESC;