/*
  # Fix Status Constraint for MainStatus - SubStatus Format

  This migration updates the clients_status_check constraint to accept the new
  "MainStatus - SubStatus" format as requested by the user.
  
  Examples of valid statuses:
  - Pending - Form not filled
  - Active - Communication ongoing
  - Lost/Cold - Ghosted
  - Won
*/

-- First, drop the existing constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Update ALL existing statuses to match the new format
-- Handle all possible old status values and map them appropriately
UPDATE clients 
SET status = CASE 
  -- Map individual sub-statuses to full format
  WHEN status = 'Form not filled' THEN 'Pending - Form not filled'
  WHEN status = 'PAF not PAID' THEN 'Pending - PAF not PAID'
  WHEN status = 'Silent after profiles' THEN 'Pending - Silent after profiles'
  WHEN status = 'Form filled, no response yet' THEN 'Active - Form filled, no response yet'
  WHEN status = 'Communication ongoing' THEN 'Active - Communication ongoing'
  WHEN status = 'Payment pending' THEN 'Active - Payment pending'
  WHEN status = 'Ghosted' THEN 'Lost/Cold - Ghosted'
  WHEN status = 'Budget constraints' THEN 'Lost/Cold - Budget constraints'
  WHEN status = 'Disappointed with profiles' THEN 'Lost/Cold - Disappointed with profiles'
  
  -- Map old system statuses to new format
  WHEN status IN ('pending', 'new') THEN 'Pending'
  WHEN status IN ('will-call-back', 'contacted', 'requirements-gathered', 'profiles-sent', 'proposals-sent') THEN 'Active'
  WHEN status IN ('closed-lost', 'lost', 'cold') THEN 'Lost/Cold'
  WHEN status IN ('won', 'hired', 'completed', 'success') THEN 'Won'
  
  -- Handle call-again statuses
  WHEN status LIKE '%call-again%' THEN 'Pending'
  
  -- Keep already correct statuses
  WHEN status IN ('Pending', 'Active', 'Lost/Cold', 'Won') THEN status
  WHEN status LIKE 'Pending - %' THEN status
  WHEN status LIKE 'Active - %' THEN status
  WHEN status LIKE 'Lost/Cold - %' THEN status
  
  -- Default for any other statuses
  ELSE 'Pending'
END;

-- Now add the constraint that accepts both MainStatus and "MainStatus - SubStatus" format
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (
    -- Allow standalone main statuses
    status IN ('Pending', 'Active', 'Lost/Cold', 'Won')
    OR
    -- Allow "MainStatus - SubStatus" format
    (
      status LIKE 'Pending - %' AND 
      status IN (
        'Pending - Form not filled',
        'Pending - PAF not PAID', 
        'Pending - Silent after profiles'
      )
    )
    OR
    (
      status LIKE 'Active - %' AND 
      status IN (
        'Active - Form filled, no response yet',
        'Active - Communication ongoing',
        'Active - Payment pending'
      )
    )
    OR
    (
      status LIKE 'Lost/Cold - %' AND 
      status IN (
        'Lost/Cold - Ghosted',
        'Lost/Cold - Budget constraints',
        'Lost/Cold - Disappointed with profiles'
      )
    )
  );