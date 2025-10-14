-- Add missing staff member
INSERT INTO staff (id, name, email, role, created_at)
VALUES (
  '8f46c155-893c-4e54-96ea-57be561ef792',
  'LM',
  'lm@gmail.com',
  'admin',
  NOW()
)
ON CONFLICT (id) DO NOTHING;