
# Project Name: Nestalk

## Description
Nestalk is a lightweight internal web application designed for the Nestara team to efficiently track candidate outreach, client inquiries, and training interest, replacing cumbersome Excel sheets and WhatsApp threads with a centralized system that integrates seamlessly with Zoho CRM.

## Primary Goals
- Track candidate inquiries (especially from ads) and monitor outreach follow-up actions.
- Manage client inquiries for staffing and training — with clear status updates and reminders.
- Record interview schedules, attendance, and outcomes in one central place.
- Enable team accountability with timestamped updates and activity visibility.
- Keep it simple — no document uploads, no profile storage duplication (Zoho handles that).

----------------------------------------------------

## Tech Stack & Environment

**Frontend:** Vite + React + TypeScript + Tailwind CSS

**Backend:** Supabase (PostgreSQL + Auth)

**Target Platform:** Single-Page Application

**Framework Versions & Config:** Latest stable versions

----------------------------------------------------

## Requirements & Features

### Core Features:

1. Candidate Tracker
   - Track inquiries from marketing (e.g. TikTok, Meta, WhatsApp, Referrals)
   - Fields: Name, Phone Number, Inquiry Source, Date Inquired, Status Tags, Notes, Reminder Date, Assigned Team Member, Interview Outcome
   - Features: Add/update manually or via bulk paste entry, Smart filters, Sort by source, date, outcome, follow-up date, View candidate interaction history and notes

2. Client Inquiry Tracker
   - Fields: Client Name/Company, Contact Info, Inquiry Date, Role Requested, Status Tags, Notes, Assigned Staff, Reminder Date
   - Features: Filter by role, status, or reminder due, Quick view of recent communication, Track progress toward closure or handoff

3. Training Interest Tracker
   - Track training inquiries separately
   - Fields: Name, Phone, Training Type, Inquiry Date, Status, Reminder Date, Notes

4. Interview Hub
   - Master list of all scheduled interviews
   - Fields: Candidate, Interview Date/Time, Location, Assigned Staff, Attendance Status, Outcome, Notes
   - Features: Calendar and table views, Filter by day/week/month, Quick links to candidate tracker

5. Updates & Reminders Log
   - Each update includes: Linked candidate/client/training inquiry, Text update, Timestamp, Team member ID, Optional reminder date
   - Display: Daily follow-up reminders list, Global activity feed, Auto-hides reminders once completed

### User Flows
- Candidate Inquiry
  - Admin logs candidate from ad → Tags status → Adds notes/reminders
  - Later: logs call result or schedules interview → Updates outcome

- Client Inquiry
  - Admin enters inquiry → Updates stages → Adds notes/reminders
  - Used to track placement momentum (esp. before profiles are shared)

- Training Lead
  - Staff logs inquiry → Monitors until joined or dropped off

- Interview Tracking
  - Candidate marked as scheduled → Attendance recorded → Outcome logged
  - Review history as part of vetting for placement

- Daily Use
  - Staff logs in → Sees today’s follow-ups → Updates progress
  - Admins monitor movement across dashboard summaries

### Business Rules
- All updates must be tied to a user and timestamp.
- No status change without a note or reason.
- Follow-up reminders trigger visual alert when due.
- Interview outcomes must be logged within 24 hours.

----------------------------------------------------

## UI/UX Design

### Layout
- Dashboard (highlights: overdue follow-ups, interviews today, inquiries this week)
- Candidates Tracker
- Clients Tracker
- Training Leads Tracker
- Interview Hub
- Reminders & Updates Feed

### Look & Feel
- Clean and minimalistic design with intuitive navigation.
- Color-coded statuses and reminders for quick visual cues.

### Pages
- Dashboard
- Candidates Tracker
- Clients Tracker
- Training Leads Tracker
- Interview Hub
- Updates & Reminders

### Components
- Global Search + Filters (source, status, date range)
- Candidate/Client/Training cards with detail modals
- Inline status updates + notes
- Color-coded reminders
- Interview calendar table

----------------------------------------------------

## Data Model & Supabase Setup

### Database Schema
- Table: candidates
  - Fields: id, name, phone, source, inquiry_date, status, reminder_date, assigned_to, notes

- Table: clients
  - Fields: id, name, contact, role, inquiry_date, status, reminder_date, assigned_to, notes

- Table: training_leads
  - Fields: id, name, phone, training_type, inquiry_date, status, notes, reminder_date, assigned_to

- Table: interviews
  - Fields: id, candidate_id, date_time, location, assigned_staff, attended, outcome, notes

- Table: updates
  - Fields: id, linked_to_type, linked_to_id, user_id, update_text, created_at, reminder_date

### Row-Level Security
Enabled by default

### Auth Requirements
Role-based user access, managed via Supabase Auth

[
  {
    "Pillar": "Childcare & Development",
    "Criterion": "Daily routine & structure",
    "Why": "Predictable days make children feel safe and calm.",
    "How": "Ask for a simple day plan by age; listen for meals, naps, play, hygiene, and quiet time.",
    "Weight": 0.25,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Give a simple day plan for a toddler (morning→evening). Include meal times, nap times, active play, quiet time, and hygiene. Say how you adjust if the child is sick or fussy.",
    "Score 1 – Needs Training": "Vague; misses naps/meals; relies on TV; no plan for changes.",
    "Score 2 – Emerging": "Some structure, but missing one block (e.g., no nap plan) or times unrealistic.",
    "Score 3 – Meets Standard": "Includes meals, naps, play, hygiene; roughly sensible times; some flexibility.",
    "Score 4 – Strong": "Structured schedule with small contingencies (rainy day, travel), gentle transitions.",
    "Score 5 – Excellent": "Clear timeline with age‑fit play, quiet/reading, outdoor time; explains adjustments (illness, bad day); mentions parent preferences.",
    "Red Flags": "“I just follow the child”; TV as schedule; no plan for conflicts."
  },
  {
    "Pillar": "Childcare & Development",
    "Criterion": "Age-appropriate play & learning",
    "Why": "Right activities support development and reduce screen time.",
    "How": "Ask for 3 screen‑free activities for a named age and why they help.",
    "Weight": 0.25,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Name three screen‑free activities for a preschooler and tell me why each helps the child.",
    "Score 1 – Needs Training": "Unsafe/age‑inappropriate ideas; no reasons; only screens.",
    "Score 2 – Emerging": "Two good ideas with brief reasons; third is weak.",
    "Score 3 – Meets Standard": "Simple crafts, stories, outdoor play; one basic reason.",
    "Score 4 – Strong": "Adds self‑help skills, turn‑taking; adapts for shy/active child.",
    "Score 5 – Excellent": "Varied (fine/gross motor, language, social); clear reason for each.",
    "Red Flags": "Unsupervised risky play; rote drilling only; poor supervision."
  },
  {
    "Pillar": "Childcare & Development",
    "Criterion": "Sleep & soothing",
    "Why": "Good sleep keeps children healthy; calm routines reduce conflict.",
    "How": "Ask bedtime steps and how to handle night wake‑ups.",
    "Weight": 0.25,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "How would you help a 4‑year‑old who resists bedtime? Tell me your steps and how you handle wake‑ups.",
    "Score 1 – Needs Training": "Uses threats/TV; no routine; inconsistent; escalates conflict.",
    "Score 2 – Emerging": "Has routine but allows occasional screen; unsure about consistency at 2am.",
    "Score 3 – Meets Standard": "Simple routine (wash, story, lights out); calm voice; repeats steps.",
    "Score 4 – Strong": "Mentions sleep environment, soothing objects, regressions and reset plan.",
    "Score 5 – Excellent": "Consistent routine, no sugar/screens pre‑bed, choices, gentle return‑to‑bed; knows when to escalate to parent.",
    "Red Flags": "Suggests sedatives without approval; locks child in; shames."
  },
  {
    "Pillar": "Childcare & Development",
    "Criterion": "Hygiene & toilet/diaper care",
    "Why": "Clean habits prevent infections and rashes; positive tone builds independence.",
    "How": "Ask step‑by‑step diaper/potty method and handwashing.",
    "Weight": 0.25,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Explain your diaper change or potty support steps, including hygiene and how you talk to the child.",
    "Score 1 – Needs Training": "Skips handwashing/surface clean; unsafe disposal; harsh talk.",
    "Score 2 – Emerging": "Forgets one hygiene step or weak child communication.",
    "Score 3 – Meets Standard": "Basic steps: prepare area, wipe front‑to‑back, cream if needed, wash hands.",
    "Score 4 – Strong": "Adds travel kit plan; handles accidents calmly; fluids/fiber reminders.",
    "Score 5 – Excellent": "Full routine, checks rashes, cleans surfaces/tools, praises effort, records patterns.",
    "Red Flags": "Reuses dirty wipes/cloths; leaves soiled items accessible; shames."
  },
  {
    "Pillar": "Safety & First Aid",
    "Criterion": "Home & outdoor safety",
    "Why": "Spotting hazards prevents injuries.",
    "How": "Give a room/outing and ask for 3 risks and fixes.",
    "Weight": 0.25,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "You’re with a crawling baby in a sitting room—name three dangers and what you’d do. Add one outdoor risk and fix.",
    "Score 1 – Needs Training": "Misses obvious hazards; unsafe fixes; says ‘watch only’.",
    "Score 2 – Emerging": "Two solid hazards, one weak; partly correct fixes.",
    "Score 3 – Meets Standard": "Outlets, sharp edges, choking items; simple fixes (cover, move, supervise).",
    "Score 4 – Strong": "Furniture anchoring, hot liquids, stair gates, road safety steps.",
    "Score 5 – Excellent": "Adds cords/windows/bath risks; safe zones; continuous supervision; explains why.",
    "Red Flags": "“Child will learn by falling”; walkers near stairs; water buckets left."
  },
  {
    "Pillar": "Safety & First Aid",
    "Criterion": "Emergency response",
    "Why": "Fast, calm action reduces harm.",
    "How": "Ask DRSABC basics and who to call first in Kenya.",
    "Weight": 0.25,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "A child is unresponsive. What are your first steps? When do you call 999 and the parent?",
    "Score 1 – Needs Training": "Panics; wrong order; delays help; no contacts.",
    "Score 2 – Emerging": "Knows most steps but hesitates on 999 vs parent order.",
    "Score 3 – Meets Standard": "Danger, shout for help, open airway, check breathing; call parent.",
    "Score 4 – Strong": "Recovery position if breathing; stays on call, monitors.",
    "Score 5 – Excellent": "Full DRSABC; call 999 & parent; CPR if not breathing; keep time/info.",
    "Red Flags": "Shakes child; unknown meds; filming instead of acting."
  },
  {
    "Pillar": "Safety & First Aid",
    "Criterion": "Basic first aid",
    "Why": "Simple care for fever, burns, cuts; knows when to escalate.",
    "How": "Ask fever response and when to seek care.",
    "Weight": 0.25,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "A child has 39.5°C fever. What do you do? When do you escalate to clinic?",
    "Score 1 – Needs Training": "Alcohol rubs; adult meds; delays help.",
    "Score 2 – Emerging": "Mostly correct but unsure on red flags/dosing.",
    "Score 3 – Meets Standard": "Check temp correctly, fluids, light clothing, inform parent, monitor.",
    "Score 4 – Strong": "Dose by parent/label, log temps, comfort care; avoids aspirin.",
    "Score 5 – Excellent": "Knows red flags (lethargy, convulsions), only parent‑approved meds, when to go to clinic.",
    "Red Flags": "Antibiotics at home; cold baths; ignores seizures."
  },
  {
    "Pillar": "Safety & First Aid",
    "Criterion": "Food hygiene & allergies",
    "Why": "Clean prep and allergy care prevent illness and reactions.",
    "How": "Ask cross‑contamination steps and label checks.",
    "Weight": 0.25,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "How do you cook for a child with a nut allergy? Tell me how you avoid cross‑contamination.",
    "Score 1 – Needs Training": "Uses nut items; no label checks; shared utensils.",
    "Score 2 – Emerging": "Does most steps but forgets one barrier (e.g., separate sponge).",
    "Score 3 – Meets Standard": "Avoid nuts, read labels, separate utensils, clean surfaces; inform parent.",
    "Score 4 – Strong": "Separate prep area, sealed storage, checks ‘may contain’ advisories.",
    "Score 5 – Excellent": "Understands hidden allergens, storage rules, handwashing; knows EpiPen handover.",
    "Red Flags": "“A little is fine”; tries new foods unapproved; dismisses reactions."
  },
  {
    "Pillar": "Cooking & Nutrition",
    "Criterion": "Balanced meals",
    "Why": "Balanced food supports growth; variety reduces fussiness.",
    "How": "Ask for a simple 2‑day menu for an age.",
    "Weight": 0.34,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Share a simple 2‑day menu for a school‑age child. Include breakfast, lunch, dinner and a snack each day.",
    "Score 1 – Needs Training": "Unbalanced (fried/carbs only); no veg/fruit; sugary drinks.",
    "Score 2 – Emerging": "Balanced day one; day two weak on veg or fruit.",
    "Score 3 – Meets Standard": "Veg/fruit, protein, whole grains, water; reasonable portions.",
    "Score 4 – Strong": "Lunchbox ideas, hydration plan, prep tips (batch soup/rice).",
    "Score 5 – Excellent": "Variety across days; planned snacks; limits sugar; adapts to culture/allergies.",
    "Red Flags": "Unsafe foods for age; energy drinks; ignores allergies."
  },
  {
    "Pillar": "Cooking & Nutrition",
    "Criterion": "Choking-risk awareness",
    "Why": "Safe textures prevent choking, especially for toddlers.",
    "How": "Ask how to serve a risky food safely.",
    "Weight": 0.33,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "How would you serve carrots to a toddler safely? Include texture and supervision.",
    "Score 1 – Needs Training": "Raw rounds; leaves child alone; running while eating.",
    "Score 2 – Emerging": "Softens food but forgets seating or supervision.",
    "Score 3 – Meets Standard": "Cook soft, cut small; close supervision; seated eating.",
    "Score 4 – Strong": "Cut lengthwise → thin sticks; check temperature; no distractions while eating.",
    "Score 5 – Excellent": "Child upright, avoid whole nuts/hard foods; knows first‑aid response.",
    "Red Flags": "Gives whole hard foods; allows walking/eating; confuses gag vs choke."
  },
  {
    "Pillar": "Cooking & Nutrition",
    "Criterion": "Meal planning & kitchen hygiene",
    "Why": "Planning saves time and keeps the kitchen safe and clean.",
    "How": "Ask batch‑prep, storage, and clean‑as‑you‑go steps.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How do you plan weekly meals and keep the kitchen clean? Include storage and ‘clean as you go’.",
    "Score 1 – Needs Training": "No plan; dirty surfaces; unsafe storage; mixes raw/cooked.",
    "Score 2 – Emerging": "Has plan but forgets dating/labeling or cross‑contamination step.",
    "Score 3 – Meets Standard": "Simple plan, label & date, wipe surfaces, separate raw/cooked.",
    "Score 4 – Strong": "Fridge zones, reheating rules, thaw in fridge, leftovers window.",
    "Score 5 – Excellent": "Weekly plan from parent’s list; batch‑cook; FIFO storage; sanitise boards/sponges.",
    "Red Flags": "Leaves food out >2 hrs; refreezes cooked leftovers; same board raw/cooked."
  },
  {
    "Pillar": "Home Standards & Housekeeping",
    "Criterion": "Child-area cleanliness",
    "Why": "Clean play areas reduce sickness and clutter; safer for explorers.",
    "How": "Ask daily tidy vs weekly deep‑clean routine.",
    "Weight": 0.34,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How do you keep play areas clean on a busy day? Tell me your daily quick tidy and weekly deep clean.",
    "Score 1 – Needs Training": "Rare tidy; mixes dirty/clean toys; seldom wipes.",
    "Score 2 – Emerging": "Tidies daily but deep‑clean plan thin/irregular.",
    "Score 3 – Meets Standard": "Tidy basket, wipe high‑touch items; weekly deep clean.",
    "Score 4 – Strong": "Timer methods, end‑of‑day sweep, age‑fit child jobs.",
    "Score 5 – Excellent": "Zones/routines; safe disinfectant; soft‑toys laundry; involve child age‑appropriately.",
    "Red Flags": "Harsh chemicals near child; sprays near food; leaves choking debris."
  },
  {
    "Pillar": "Home Standards & Housekeeping",
    "Criterion": "Safe cleaning practices",
    "Why": "Right products protect children and surfaces.",
    "How": "Ask products near infants and storage/ventilation.",
    "Weight": 0.33,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "What cleaners would you use around an infant? How do you store and ventilate?",
    "Score 1 – Needs Training": "Strong bleach near baby; poor storage; mixes chemicals.",
    "Score 2 – Emerging": "Mostly safe but forgets ventilation or PPE.",
    "Score 3 – Meets Standard": "Mild/child‑safe; dilute correctly; lock away; rinse well.",
    "Score 4 – Strong": "Product‑by‑surface choices; spray away from child; gloves for harsh agents.",
    "Score 5 – Excellent": "Reads labels, tests small area, ventilates; separate cloths; never mix chemicals.",
    "Red Flags": "Unlabeled decants; within child reach; bleach+ammonia mix."
  },
  {
    "Pillar": "Home Standards & Housekeeping",
    "Criterion": "Time management",
    "Why": "Prioritising keeps the home running during childcare.",
    "How": "Ask how they juggle tasks when everything is urgent.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "When everything is urgent, what do you do first? How do you communicate with parents?",
    "Score 1 – Needs Training": "Panics; tries everything; no communication.",
    "Score 2 – Emerging": "Right order but forgets to confirm priorities with parent.",
    "Score 3 – Meets Standard": "Child safety/needs first, then quick wins; tell parent trade‑offs.",
    "Score 4 – Strong": "Stop‑start strategy, schedule around naps, reminders for key tasks.",
    "Score 5 – Excellent": "Blocks, batch tasks, checklists; reset when child settles; updates parent.",
    "Red Flags": "Leaves child unattended for chores; hides delays; overpromises."
  },
  {
    "Pillar": "Laundry & Garment Care",
    "Criterion": "Sorting & fabric care",
    "Why": "Right sorting prevents damage and colour run.",
    "How": "Ask labels, whites/colours/delicates handling.",
    "Weight": 0.34,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How do you handle whites, colours, and delicates? Include temperatures and label checks.",
    "Score 1 – Needs Training": "Mixes loads; wrong temps; ignores labels.",
    "Score 2 – Emerging": "Sorts well but forgets temp nuance or label symbols.",
    "Score 3 – Meets Standard": "Sort by colour/fabric; correct temp; read labels.",
    "Score 4 – Strong": "Pre‑test bright colours, inside‑out, zip closures.",
    "Score 5 – Excellent": "Mesh bags, gentle cycles, air‑dry delicates; check colour‑bleed first.",
    "Red Flags": "Hot wash delicates; bleach on colours; shrinks wool/silk."
  },
  {
    "Pillar": "Laundry & Garment Care",
    "Criterion": "Stain treatment",
    "Why": "Quick, correct treatment saves clothes.",
    "How": "Ask steps for common stains (grass/food/ink).",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How do you remove grass or food stains from uniforms? Tell me your steps.",
    "Score 1 – Needs Training": "Scrubs harshly; hot water sets stain; random chemicals.",
    "Score 2 – Emerging": "Forgets test area or check before drying.",
    "Score 3 – Meets Standard": "Blot, pre‑treat, soak, wash; check before drying.",
    "Score 4 – Strong": "Enzyme soaks, oxygen bleach for whites, sunlight for safe fabrics.",
    "Score 5 – Excellent": "Agents by stain type; test small area; repeat gently; avoid heat until gone.",
    "Red Flags": "Bleach directly; tumble‑dries set stains; damages fabric."
  },
  {
    "Pillar": "Laundry & Garment Care",
    "Criterion": "Ironing & finishing",
    "Why": "Neat finishing reflects high standards and comfort.",
    "How": "Ask sequence and temperature choice.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Walk me through ironing a cotton shirt from start to finish.",
    "Score 1 – Needs Training": "Wrong temp; shiny marks; creases left.",
    "Score 2 – Emerging": "Sequence OK but misses steam or cooling/hanging step.",
    "Score 3 – Meets Standard": "Right heat; steam if needed; collar‑cuffs‑sleeves‑body; hang promptly.",
    "Score 4 – Strong": "Spray bottle for stubborn creases; tip of iron for corners; avoid prints.",
    "Score 5 – Excellent": "Press cloth, check label first, shape on hanger; safe iron storage.",
    "Red Flags": "Irons on decorated areas; iron face‑down; burns fabric."
  },
  {
    "Pillar": "Communication & Interpersonal",
    "Criterion": "Updates to parents",
    "Why": "Short, clear updates build trust and avoid surprises.",
    "How": "Ask when/how they report; what they include.",
    "Weight": 0.34,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How will you keep parents updated during the day? When do you update and what do you include?",
    "Score 1 – Needs Training": "No plan; overshares/spams; hides issues.",
    "Score 2 – Emerging": "Has cadence but content is vague or misses key info.",
    "Score 3 – Meets Standard": "Morning handover; short WhatsApp; one midday; emergencies immediately.",
    "Score 4 – Strong": "End‑of‑day summary; photo proof if allowed; timing sensitivity.",
    "Score 5 – Excellent": "Tailors to preference; simple log (food/naps/mood); flags issues with options.",
    "Red Flags": "Photos without consent; posts online; argues in chat."
  },
  {
    "Pillar": "Communication & Interpersonal",
    "Criterion": "Listening & following instructions",
    "Why": "Good listening keeps care consistent and safe.",
    "How": "Ask how they confirm instructions and show proof.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "How do you make sure you understood new instructions? How will you prove you followed them?",
    "Score 1 – Needs Training": "Just says ‘OK’ and guesses; forgets steps.",
    "Score 2 – Emerging": "Repeats back but forgets reminders or deadline.",
    "Score 3 – Meets Standard": "Repeat back steps; write notes; one clarifying question.",
    "Score 4 – Strong": "Checklist, labels, double‑check before acting; follow‑up after.",
    "Score 5 – Excellent": "Summarise, set reminders, confirm timing, share photo proof if needed.",
    "Red Flags": "Acts without clarity; changes rules; blames others."
  },
  {
    "Pillar": "Communication & Interpersonal",
    "Criterion": "Boundaries & confidentiality",
    "Why": "Privacy protects the family and child.",
    "How": "Ask about photos, visitors, private info handling.",
    "Weight": 0.33,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "Would you post a child’s photo if asked? Why/why not? What is your rule on visitors and private info?",
    "Score 1 – Needs Training": "Says yes to posting; invites visitors; shares private details.",
    "Score 2 – Emerging": "Understands consent but unsure on location/metadata or visitors.",
    "Score 3 – Meets Standard": "Only with parent consent and house rules; no location sharing.",
    "Score 4 – Strong": "Secure storage of numbers, no screenshots/forwards; asks permission each time.",
    "Score 5 – Excellent": "Declines politely; follows written policy; no gossip or posting.",
    "Red Flags": "Publishes for ‘portfolio’; jokes about family online; records secretly."
  },
  {
    "Pillar": "Professionalism & Integrity",
    "Criterion": "Punctuality & reliability",
    "Why": "Reliability reduces household stress and planning risk.",
    "How": "Ask what they do if they’ll be late; backup plans.",
    "Weight": 0.34,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "If you’ll be late, what do you do? Mention notification, ETA, and backup plans.",
    "Score 1 – Needs Training": "No notice; repeats lateness; excuses.",
    "Score 2 – Emerging": "Usually notifies but lacks backup or follow‑through.",
    "Score 3 – Meets Standard": "Call/text early, give ETA, make up time if asked.",
    "Score 4 – Strong": "Transport buffers, alarms, contingency contact.",
    "Score 5 – Excellent": "Backup route/plan; rare lateness with proof; logs time made up.",
    "Red Flags": "No‑shows; phone off; blames without solution."
  },
  {
    "Pillar": "Professionalism & Integrity",
    "Criterion": "Honesty & accountability",
    "Why": "Owning mistakes keeps long‑term trust and safety.",
    "How": "Ask about accidental damage scenario and follow‑up.",
    "Weight": 0.33,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "If you break something, how do you handle it? What do you do after?",
    "Score 1 – Needs Training": "Hides it; blames others; lies.",
    "Score 2 – Emerging": "Reports but vague on remedy or prevention.",
    "Score 3 – Meets Standard": "Report immediately, apologise, explain, offer to help fix.",
    "Score 4 – Strong": "Cost awareness, incident log, check‑in next day.",
    "Score 5 – Excellent": "Send photo, suggest solution, prevent repeat, accept consequence.",
    "Red Flags": "Deletes evidence; shifts blame; repeats mistake."
  },
  {
    "Pillar": "Professionalism & Integrity",
    "Criterion": "Policy adherence",
    "Why": "Following house rules keeps focus and safety.",
    "How": "Ask about phone use/visitors at work; emergency rules.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "What’s your approach to phone use while working? And what about visitors?",
    "Score 1 – Needs Training": "On phone often; ignores rules; brings visitors.",
    "Score 2 – Emerging": "Mostly follows, but unclear on emergency exceptions.",
    "Score 3 – Meets Standard": "Phone away during care; short checks on breaks; emergencies only.",
    "Score 4 – Strong": "Do Not Disturb, log calls, ask permission for exceptions.",
    "Score 5 – Excellent": "Silence/lock phone; share emergency contacts; follow written rules exactly.",
    "Red Flags": "Live‑streaming/recording; personal calls during care; frequent visitors."
  },
  {
    "Pillar": "Attitude & Emotional Management",
    "Criterion": "Calm under pressure",
    "Why": "Calm responses stop problems growing and keep children safe.",
    "How": "Ask about tantrum/sibling conflict with steps taken.",
    "Weight": 0.34,
    "Critical (Y/N)": "Y",
    "Interviewer Question (use verbatim)": "Tell me about a time you stayed calm with a tantrum. What steps did you take?",
    "Score 1 – Needs Training": "Shouts or threatens; rough handling; gives up.",
    "Score 2 – Emerging": "Mostly calm but forgets naming feelings or choices.",
    "Score 3 – Meets Standard": "Breathes, names feelings, offers simple choices; stays kind.",
    "Score 4 – Strong": "Safety first, cool‑down space, consistent follow‑through.",
    "Score 5 – Excellent": "Predicts triggers, prepares activities, low voice, de‑escalates; reflects later.",
    "Red Flags": "Physical punishment; humiliation; long isolation."
  },
  {
    "Pillar": "Attitude & Emotional Management",
    "Criterion": "Receptive to feedback",
    "Why": "Feedback helps improve care quickly and respectfully.",
    "How": "Ask about feedback received and applied changes.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Tell me about feedback you received and what you changed afterwards.",
    "Score 1 – Needs Training": "Defensive; denies; no change.",
    "Score 2 – Emerging": "Accepts feedback but no follow‑up confirmation.",
    "Score 3 – Meets Standard": "Listens, thanks, tries change same day; updates parent.",
    "Score 4 – Strong": "Tracks improvement, asks for re‑feedback, documents routine.",
    "Score 5 – Excellent": "Asks for examples, writes plan, checks back after a week with results.",
    "Red Flags": "Blames parent/child; argues; repeats behaviour."
  },
  {
    "Pillar": "Attitude & Emotional Management",
    "Criterion": "Positive, proactive mindset",
    "Why": "Looking ahead prevents small issues becoming big problems.",
    "How": "Ask about fixing a small household problem early.",
    "Weight": 0.33,
    "Critical (Y/N)": "N",
    "Interviewer Question (use verbatim)": "Describe a time you solved a small problem early before it grew.",
    "Score 1 – Needs Training": "Ignores issue; waits for parent for everything.",
    "Score 2 – Emerging": "Suggests fix but forgets to confirm or document.",
    "Score 3 – Meets Standard": "Spots issue, suggests one option, confirms OK, fixes safely.",
    "Score 4 – Strong": "Pattern spotting, quick wins, reminder to monitor.",
    "Score 5 – Excellent": "Offers 2–3 safe options, explains pros/cons, fixes and documents; prevents repeat.",
    "Red Flags": "Takes risky shortcuts; spends family money without consent."
  }
]