-- Check how many courses exist

SELECT 
  id,
  name,
  is_active
FROM niche_courses
WHERE is_active = true
ORDER BY name;
