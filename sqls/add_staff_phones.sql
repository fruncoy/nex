-- Add phone column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;

-- Populate phone numbers
UPDATE staff SET phone = '+254726877188' WHERE id = '6e9d3f52-2850-494e-868a-f4ffe3d4893e'; -- Leon
UPDATE staff SET phone = '+254714478427' WHERE id = '8180624a-75cc-4458-800f-9cbf3b777cfc'; -- Ivy
UPDATE staff SET phone = '+254715940269' WHERE id = '56794a5b-d298-4053-aba5-8f16338f30f1'; -- Steven
UPDATE staff SET phone = '+254745491668' WHERE id = '80dd8af7-9492-4349-9fed-f21f4327f612'; -- Liduine
UPDATE staff SET phone = '+254725865594' WHERE id = '3e6fb44f-d254-4f97-a509-ef121ebfb352'; -- Monica
UPDATE staff SET phone = '+254718574652' WHERE id = 'e06bc50c-b85b-427b-8d00-9fdd2a3e8b32'; -- Purity
UPDATE staff SET phone = '+254700373269' WHERE id = '23b322f0-38ef-4f48-815c-a7771dce42ab'; -- Taana (Abigail)
UPDATE staff SET phone = '+254110491999' WHERE id = '797757ff-9532-408e-afc0-aa5ad4eda86a'; -- Frank

-- Verify
SELECT id, name, username, phone FROM staff ORDER BY name;
