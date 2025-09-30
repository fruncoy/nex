@@ .. @@
   reminder_date date,
-  assigned_to uuid REFERENCES auth.users(id),
+  assigned_to uuid REFERENCES staff(id),
   notes text DEFAULT '',
   interview_outcome text,
   created_at timestamptz DEFAULT now()
@@ .. @@
   reminder_date date,
-  assigned_to uuid REFERENCES auth.users(id),
+  assigned_to uuid REFERENCES staff(id),
   notes text DEFAULT '',
   created_at timestamptz DEFAULT now()
 );
@@ .. @@
   reminder_date date,
-  assigned_to uuid REFERENCES auth.users(id),
+  assigned_to uuid REFERENCES staff(id),
   notes text DEFAULT '',
   created_at timestamptz DEFAULT now()
 );
@@ .. @@
   date_time timestamptz NOT NULL,
   location text NOT NULL,
-  assigned_staff uuid REFERENCES auth.users(id),
+  assigned_staff uuid REFERENCES staff(id),
   attended boolean DEFAULT false,
   outcome text,
@@ .. @@
   linked_to_type text NOT NULL CHECK (linked_to_type IN ('candidate', 'client', 'training_lead', 'interview')),
   linked_to_id uuid NOT NULL,
-  user_id uuid REFERENCES auth.users(id) NOT NULL,
+  user_id uuid REFERENCES staff(id) NOT NULL,
   update_text text NOT NULL,
   reminder_date date,