@@ .. @@
   linked_to_type text NOT NULL CHECK (linked_to_type IN ('candidate', 'client', 'training_lead')),
   linked_to_id uuid NOT NULL,
-  user_id uuid REFERENCES auth.users(id) NOT NULL,
+  user_id uuid REFERENCES staff(id) NOT NULL,
   description text NOT NULL,
-  follow_up_assigned_to uuid REFERENCES auth.users(id),
+  follow_up_assigned_to uuid REFERENCES staff(id),
   created_at timestamptz DEFAULT now()
 );