-- 1. First, create a "virtual" user in auth.users to satisfy the foreign key constraint
-- This allows Nesta to have a real entry that the staff table can point to
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'nestarakenya@gmail.com',
  crypt('NestaAI2024!', gen_salt('bf')), -- Secure but placeholder password
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nesta AI"}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- 2. Now insert into the staff table
INSERT INTO staff (id, name, email, role, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Nesta',
  'Nestarakenya@gmail.com',
  'admin',
  'NEX',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  username = EXCLUDED.username;
