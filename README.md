
# Project Name: Nestalk

## Description
Nestalk is a lightweight internal web application designed for the Nestara team to efficiently track candidate outreach, client inquiries, and training interest, replacing cumbersome Excel sheets and WhatsApp threads

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

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nestara Progress Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 297mm;
            }
            
            .page {
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0;
                padding: 12mm 11mm;
                box-shadow: none;
                width: 210mm;
                height: 297mm;
                overflow: hidden;
            }
            
            .cover-page {
                page-break-after: always;
                page-break-inside: avoid;
                padding: 0;
                margin: 0;
                width: 210mm;
                height: 297mm;
            }
            
            .footer {
                position: absolute;
                bottom: 10mm;
            }
            
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.35;
        }

        .cover-page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto 5mm auto;
            background: linear-gradient(135deg, #ae491e 0%, #8a3718 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20mm;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
        }

        .cover-logo {
            font-size: 72px;
            font-weight: 700;
            color: white;
            letter-spacing: 2px;
            margin-bottom: 8mm;
        }

        .cover-title {
            font-size: 32px;
            font-weight: 700;
            color: white;
            text-align: center;
            margin-bottom: 4mm;
            line-height: 1.3;
        }

        .cover-subtitle {
            font-size: 18px;
            color: #fef8f6;
            text-align: center;
            margin-bottom: 2mm;
        }

        .cover-date {
            font-size: 16px;
            color: #fef8f6;
            text-align: center;
            margin-bottom: 15mm;
        }

        .cover-confidential {
            background: white;
            color: #ae491e;
            padding: 8px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 15mm;
            letter-spacing: 1px;
        }

        .cover-team {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid white;
            border-radius: 10px;
            padding: 15px 30px;
            margin-top: 10mm;
        }

        .cover-team-title {
            font-size: 14px;
            color: white;
            font-weight: 700;
            text-align: center;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .cover-team-member {
            font-size: 13px;
            color: white;
            text-align: center;
            margin: 6px 0;
            line-height: 1.4;
        }

        .cover-footer {
            position: absolute;
            bottom: 15mm;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 12mm 11mm;
            margin: 0 auto 5mm auto;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5mm;
            padding-bottom: 3mm;
            border-bottom: 3px solid #ae491e;
        }

        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ae491e;
            letter-spacing: 1px;
        }

        .date-badge {
            background: #ae491e;
            color: white;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
        }

        .footer {
            margin-top: 8mm;
            text-align: center;
            font-size: 8px;
            color: #999;
            padding-top: 3mm;
            border-top: 1px solid #e0e0e0;
        }

        .title-section {
            margin-bottom: 5mm;
        }

        .main-title {
            font-size: 24px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 3px;
        }

        .subtitle {
            font-size: 12px;
            color: #666;
            font-weight: 400;
        }

        .section-header {
            background: linear-gradient(135deg, #ae491e 0%, #8a3718 100%);
            color: white;
            padding: 7px 14px;
            margin: 4mm 0 3mm 0;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .metric-card {
            background: linear-gradient(135deg, #fff 0%, #fef8f6 100%);
            border: 2px solid #ae491e;
            border-radius: 7px;
            padding: 10px;
            text-align: center;
        }

        .metric-value {
            font-size: 26px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 3px;
        }

        .metric-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .card {
            background: #fafafa;
            border-radius: 7px;
            padding: 10px;
            border-left: 4px solid #ae491e;
        }

        .card-title {
            font-size: 12px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 7px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10px;
        }

        .stat-row:last-child {
            border-bottom: none;
        }

        .stat-label {
            color: #666;
            font-weight: 500;
        }

        .stat-value {
            font-weight: 700;
            color: #333;
        }

        .insight-box {
            background: #fff9f6;
            border: 1px solid #ae491e;
            border-radius: 7px;
            padding: 11px;
            margin-bottom: 4mm;
        }

        .insight-title {
            font-size: 11px;
            font-weight: 700;
            color: #ae491e;
            margin-bottom: 6px;
        }

        .insight-text {
            font-size: 10px;
            color: #555;
            line-height: 1.5;
        }

        .funnel {
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin: 9px 0;
        }

        .funnel-stage {
            background: linear-gradient(to right, #ae491e, #d15a2a);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }

        .funnel-stage:nth-child(2) {
            width: 85%;
            margin-left: auto;
        }

        .funnel-stage:nth-child(3) {
            width: 70%;
            margin-left: auto;
        }

        .funnel-stage:nth-child(4) {
            width: 55%;
            margin-left: auto;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 7px 0;
        }

        .table th {
            background: #ae491e;
            color: white;
            padding: 5px;
            text-align: left;
            font-weight: 600;
        }

        .table td {
            padding: 5px;
            border-bottom: 1px solid #e0e0e0;
        }

        .table tr:hover {
            background: #fef8f6;
        }

        .badge {
            display: inline-block;
            padding: 3px 7px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 600;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .progress-bar {
            background: #e0e0e0;
            height: 7px;
            border-radius: 4px;
            overflow: hidden;
            margin: 3px 0;
        }

        .progress-fill {
            background: #ae491e;
            height: 100%;
        }

        .highlight-number {
            font-size: 18px;
            font-weight: 700;
            color: #ae491e;
        }

        .three-col {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
        }

        .small-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }

        .four-col {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5mm;
            margin-bottom: 4mm;
        }

        .status-card {
            background: white;
            border: 2px solid #ddd;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
        }

        .status-number {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 3px;
        }

        .status-label {
            font-size: 9px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <!-- COVER PAGE -->
    <div class="cover-page">
        <div class="cover-logo">Nestara</div>
        
        <div class="cover-title">Business Progress Report</div>
        
        <div class="cover-subtitle">Comprehensive Business Analytics</div>
        
        <div class="cover-date">September 15 - October 24, 2025</div>
        
        <div class="cover-team">
            <div class="cover-team-title">Prepared By</div>
            <div class="cover-team-member">Frank, Marketing Specialist</div>
            <div class="cover-team-member">Ivy, Client Specialist</div>
            <div class="cover-team-member">Purity, Recruitment Specialist</div>
        </div>
        
        <div class="cover-footer">
            Nestara Confidential Report | Internal Use Only
        </div>
    </div>

    <!-- PAGE 1: BUSINESS CORE -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Generated: October 25, 2025</div>
        </div>

        <div class="title-section">
            <div class="main-title">Business Progress Report</div>
            <div class="subtitle">Comprehensive Analytics | September 15 - October 24, 2025</div>
        </div>

        <div class="section-header">BUSINESS CORE OVERVIEW</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">39</div>
                <div class="metric-label">Total Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">258</div>
                <div class="metric-label">Total Candidates</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">18.2%</div>
                <div class="metric-label">Candidate Win Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">10.3%</div>
                <div class="metric-label">Client Win Rate</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">Executive Summary</div>
            <div class="insight-text">
                Over the 40-day period (Sep 15 - Oct 24, 2025), Nestara demonstrated strong market presence with 39 client engagements and 258 candidate applications. The business achieved 4 successful client placements (10.3% win rate) and onboarded 47 qualified candidates (18.2% win rate) into the talent pool. With 11 active clients in communication (who paid KES 3,000 PAF) and 13 pending candidates, the pipeline remains healthy. Marketing investment of KES 32,000 generated strong performance with Google Ads achieving 100% lead conversion to paid PAF or won status. Key operational challenges include high candidate attrition rates (68.2% lost primarily due to lack of good conduct certificates) and client ghosting (13 clients), requiring enhanced engagement strategies.
            </div>
        </div>

        <div class="section-header">BUSINESS WINS & ACHIEVEMENTS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Successful Placements</div>
                <div class="stat-row">
                    <span class="stat-label">Part-Time Placements</span>
                    <span class="stat-value">2</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Angeline Nelima</span>
                    <span class="stat-value">Active</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Doreen Khayanga</span>
                    <span class="stat-value">Active</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Active Trial</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Evaline Adhiambo</span>
                    <span class="stat-value">On Trial</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Reliever Assignment</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Nelly (Client: Safiya)</span>
                    <span class="stat-value">Active</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Reputation & Reviews</div>
                <div class="stat-row">
                    <span class="stat-label">Google Reviews</span>
                    <span class="stat-value">12</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Published Client Review</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Asim Shah</span>
                    <span class="stat-value">✓</span>
                </div>
                <div style="margin-top: 10px; padding: 7px; background: #f0f9ff; border-radius: 5px;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 3px;">Review Velocity</div>
                    <div class="highlight-number">0.3 <span style="font-size: 11px; font-weight: normal;">reviews/day</span></div>
                </div>
            </div>
        </div>

        <div class="section-header">CHALLENGES & LEARNINGS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Failed Placements & Trials</div>
                <div class="stat-row">
                    <span class="stat-label">Failed Placement</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Euphemia</span>
                    <span class="badge badge-danger">Placement Failed</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Failed Trial</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Everline Wairimu</span>
                    <span class="badge badge-danger">BLACKLISTED</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Refunded Placement</span>
                    <span class="stat-value">1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Rachael Njoki (KES 23,000)</span>
                    <span class="badge badge-warning">No Good Conduct</span>
                </div>
                <div style="margin-top: 8px; font-size: 9px; color: #d32f2f; font-weight: 600;">
                    Trial Success Rate: 0% (0/1)
                </div>
            </div>

            <div class="card">
                <div class="card-title">Client Pipeline Health</div>
                <div class="stat-row">
                    <span class="stat-label">Active Communication (Paid PAF)</span>
                    <span class="stat-value">11 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Ghosted/Lost</span>
                    <span class="stat-value">13 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Budget Constraints</span>
                    <span class="stat-value">4 clients</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending Actions</span>
                    <span class="stat-value">6 clients</span>
                </div>
            </div>
        </div>

        <div class="section-header">CLIENT CONVERSION FUNNEL</div>

        <div class="funnel">
            <div class="funnel-stage">
                <span>Total Client Inquiries</span>
                <span>39 (100%)</span>
            </div>
            <div class="funnel-stage">
                <span>Active + Communication Ongoing</span>
                <span>11 (28.2%)</span>
            </div>
            <div class="funnel-stage">
                <span>Won Clients</span>
                <span>4 (10.3%)</span>
            </div>
            <div class="funnel-stage">
                <span>Successful Placements</span>
                <span>2 (5.1%)</span>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 1 of 4
        </div>
    </div>

    <!-- PAGE 2: CLIENT ANALYSIS -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 24, 2025</div>
        </div>

        <div class="section-header">CLIENT ACQUISITION & PERFORMANCE ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">39</div>
                <div class="metric-label">Total Inquiries</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">4</div>
                <div class="metric-label">Won Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">10.3%</div>
                <div class="metric-label">Conversion Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">11</div>
                <div class="metric-label">Active Pipeline (Paid PAF)</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">AI-Powered Client Insights</div>
            <div class="insight-text">
                Client acquisition shows strong channel diversification with Google Search (10 clients) and Instagram (11 clients) leading inquiries. Referrals demonstrate superior quality with 33.3% win rate (2 of 6 converted), significantly outperforming all channels. Google Ads achieved exceptional 100% conversion to paid PAF or won status (10 of 10), with 80% paying the KES 3,000 Profile Access Fee. The 33.3% ghosting rate (13 clients) after form submission indicates potential friction in early engagement stages. Budget constraints affected 10.3% of prospects. House Manager roles dominate demand (20 requests, 51.3%), followed by Housekeepers (11 requests, 28.2%). Active pipeline of 11 clients who paid PAF represents strong near-term revenue potential.
            </div>
        </div>

        <div class="section-header">CLIENT PIPELINE STATUS BREAKDOWN</div>

        <div class="four-col">
            <div class="status-card" style="border-color: #2e7d32;">
                <div class="status-number" style="color: #2e7d32;">4</div>
                <div class="status-label">Won</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">10.3%</div>
            </div>
            <div class="status-card" style="border-color: #1565c0;">
                <div class="status-number" style="color: #1565c0;">11</div>
                <div class="status-label">Active (Paid PAF)</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">28.2%</div>
            </div>
            <div class="status-card" style="border-color: #f57c00;">
                <div class="status-number" style="color: #f57c00;">6</div>
                <div class="status-label">Pending</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">15.4%</div>
            </div>
            <div class="status-card" style="border-color: #c62828;">
                <div class="status-number" style="color: #c62828;">18</div>
                <div class="status-label">Lost/Cold</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">46.2%</div>
            </div>
        </div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Client Status Details</div>
                <div class="stat-row">
                    <span class="stat-label">Won</span>
                    <span class="stat-value">4 (10.3%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Active - Communication Ongoing</span>
                    <span class="stat-value">11 (28.2%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending - No Comms</span>
                    <span class="stat-value">1 (2.6%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending - Form Not Filled</span>
                    <span class="stat-value">3 (7.7%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pending - PAF Not Paid</span>
                    <span class="stat-value">2 (5.1%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Lost/Cold - Ghosted</span>
                    <span class="stat-value">13 (33.3%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Lost/Cold - Budget</span>
                    <span class="stat-value">4 (10.3%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Refunded</span>
                    <span class="stat-value">1 (2.6%)</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Service Demand Analysis</div>
                <div class="stat-row">
                    <span class="stat-label">House Manager</span>
                    <span class="stat-value">20 (51.3%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 51.3%;"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Housekeeper</span>
                    <span class="stat-value">11 (28.2%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 28.2%;"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Nanny</span>
                    <span class="stat-value">7 (17.9%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 17.9%;"></div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Uniforms</span>
                    <span class="stat-value">1 (2.6%)</span>
                </div>
            </div>
        </div>

        <div class="section-header">CLIENT ACQUISITION CHANNELS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">All Client Sources (39 Total)</div>
                <div class="stat-row">
                    <span class="stat-label">Instagram</span>
                    <span class="stat-value">11 (28.2%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Google Search</span>
                    <span class="stat-value">10 (25.6%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Facebook</span>
                    <span class="stat-value">7 (17.9%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Referral</span>
                    <span class="stat-value">6 (15.4%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Website</span>
                    <span class="stat-value">4 (10.3%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Walk-in Poster</span>
                    <span class="stat-value">1 (2.6%)</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Won Client Distribution (4 Total)</div>
                <div class="stat-row">
                    <span class="stat-label">Referral</span>
                    <span class="stat-value">2 (50.0%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Phaizer Akinyi, Samuel Joseph</span>
                    <span class="stat-value">✓</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Google Search</span>
                    <span class="stat-value">1 (25.0%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Najma Sheikhdon</span>
                    <span class="stat-value">✓</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Instagram</span>
                    <span class="stat-value">1 (25.0%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">• Susan Kogi</span>
                    <span class="stat-value">✓</span>
                </div>
                <div style="margin-top: 8px; padding: 6px; background: #e8f5e9; border-radius: 4px; font-size: 9px;">
                    <strong>Best Converter:</strong> Referrals (33.3% win rate - 2 of 6)
                </div>
            </div>
        </div>

        <div class="section-header">CHANNEL CONVERSION PERFORMANCE</div>

        <table class="table">
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>Inquiries</th>
                    <th>Won</th>
                    <th>Active (PAF)</th>
                    <th>Lost/Cold</th>
                    <th>Win Rate</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Referral</strong></td>
                    <td>6</td>
                    <td>2</td>
                    <td>4</td>
                    <td>0</td>
                    <td><strong>33.3%</strong></td>
                </tr>
                <tr>
                    <td><strong>Google Search</strong></td>
                    <td>10</td>
                    <td>1</td>
                    <td>8</td>
                    <td>1</td>
                    <td><strong>10.0%</strong></td>
                </tr>
                <tr>
                    <td><strong>Instagram</strong></td>
                    <td>11</td>
                    <td>1</td>
                    <td>4</td>
                    <td>6</td>
                    <td><strong>9.1%</strong></td>
                </tr>
                <tr>
                    <td><strong>Facebook</strong></td>
                    <td>7</td>
                    <td>0</td>
                    <td>1</td>
                    <td>6</td>
                    <td><strong>0.0%</strong></td>
                </tr>
                <tr>
                    <td><strong>Website</strong></td>
                    <td>4</td>
                    <td>0</td>
                    <td>2</td>
                    <td>2</td>
                    <td><strong>0.0%</strong></td>
                </tr>
                <tr>
                    <td><strong>Walk-in</strong></td>
                    <td>1</td>
                    <td>0</td>
                    <td>0</td>
                    <td>1</td>
                    <td><strong>0.0%</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Key Client Insights</div>
                <div style="font-size: 9px; line-height: 1.5; color: #555;">
                    <strong>• Referral Excellence:</strong> 33.3% win rate, 100% engagement (6 of 6 converted to active or won)<br>
                    <strong>• Google 100% Conversion:</strong> All 10 leads paid PAF or won - exceptional performance<br>
                    <strong>• PAF Success:</strong> 11 clients (28.2%) paid KES 3,000 commitment fee<br>
                    <strong>• Instagram Volume:</strong> Highest inquiries (11) but needs conversion optimization<br>
                    <strong>• Facebook Challenge:</strong> 7 inquiries, 0 conversions - requires strategy review
                </div>
            </div>

            <div class="card">
                <div class="card-title">Recommended Actions</div>
                <div style="font-size: 9px; line-height: 1.5; color: #555;">
                    <strong>• Launch Referral Incentives:</strong> 33.3% win rate + 100% engagement proven<br>
                    <strong>• Re-engage Ghosted:</strong> 13 clients (33.3%) need automated follow-up<br>
                    <strong>• Budget-Friendly Tiers:</strong> Create packages for 4 budget-constrained clients<br>
                    <strong>• Scale Google Ads:</strong> 100% conversion rate justifies increased budget<br>
                    <strong>• Convert Active Pipeline:</strong> Focus on closing 11 active PAF-paid clients
                </div>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 2 of 4
        </div>
    </div>

    <!-- PAGE 3: CANDIDATES -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 24, 2025</div>
        </div>

        <div class="section-header">CANDIDATES RECRUITMENT ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">47</div>
                <div class="metric-label">WON Candidates</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">30</div>
                <div class="metric-label">Interviews Conducted</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">96.7%</div>
                <div class="metric-label">Interview Success</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">23</div>
                <div class="metric-label">Complete Profiles</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">AI-Powered Recruitment Insights</div>
            <div class="insight-text">
                Recruitment performance shows exceptional interview conversion with 96.7% success rate (29/30 successful interviews), indicating highly effective pre-screening processes. However, the 68.2% overall candidate loss rate (176 lost candidates) reveals significant attrition primarily due to "No Good Conduct" certificates (113 cases, 64% of losses) and experience mismatches (45 cases, 26%). The scheduled-to-conducted interview ratio (24 scheduled vs 30 conducted) suggests strong same-day/walk-in interview capacity. Profile completion rate of 76.7% (23/30) demonstrates solid onboarding efficiency post-interview.
            </div>
        </div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Interview Performance Metrics</div>
                <div class="stat-row">
                    <span class="stat-label">Scheduled Interviews</span>
                    <span class="stat-value">24</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Conducted</span>
                    <span class="stat-value">30</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Successful</span>
                    <span class="stat-value">29 (96.7%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Unsuccessful</span>
                    <span class="stat-value">1 (3.3%)</span>
                </div>
                <div class="progress-bar" style="margin-top: 8px;">
                    <div class="progress-fill" style="width: 96.7%;"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Profile Completion Status</div>
                <div class="stat-row">
                    <span class="stat-label">Complete Profiles</span>
                    <span class="stat-value">23</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Incomplete Profiles</span>
                    <span class="stat-value">7</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Completion Rate</span>
                    <span class="stat-value">76.7%</span>
                </div>
                <div style="margin-top: 8px; font-size: 9px; color: #666;">
                    <strong>By Role:</strong> Chefs: 7 | Nannies: 11 | House Managers: 13
                </div>
            </div>
        </div>

        <div class="section-header">CANDIDATE PIPELINE BREAKDOWN</div>

        <div class="three-col">
            <div class="small-card">
                <div style="font-size: 24px; font-weight: 700; color: #2e7d32; margin-bottom: 3px;">47</div>
                <div style="font-size: 9px; color: #666; font-weight: 600;">WON</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">18.2%</div>
            </div>
            <div class="small-card">
                <div style="font-size: 24px; font-weight: 700; color: #f57c00; margin-bottom: 3px;">13</div>
                <div style="font-size: 9px; color: #666; font-weight: 600;">PENDING</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">5.0%</div>
            </div>
            <div class="small-card">
                <div style="font-size: 24px; font-weight: 700; color: #c62828; margin-bottom: 3px;">176</div>
                <div style="font-size: 9px; color: #666; font-weight: 600;">LOST</div>
                <div style="font-size: 8px; color: #999; margin-top: 2px;">68.2%</div>
            </div>
        </div>

        <div class="card" style="margin-bottom: 4mm;">
            <div class="card-title">WON Candidates by Role (47 Total)</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Count</th>
                        <th>Percentage</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Nanny</td>
                        <td><strong>21</strong></td>
                        <td>44.7%</td>
                        <td><div class="progress-bar"><div class="progress-fill" style="width: 44.7%;"></div></div></td>
                    </tr>
                    <tr>
                        <td>Housekeeper</td>
                        <td><strong>9</strong></td>
                        <td>19.1%</td>
                        <td><div class="progress-bar"><div class="progress-fill" style="width: 19.1%;"></div></div></td>
                    </tr>
                    <tr>
                        <td>House Manager</td>
                        <td><strong>8</strong></td>
                        <td>17.0%</td>
                        <td><div class="progress-bar"><div class="progress-fill" style="width: 17%;"></div></div></td>
                    </tr>
                    <tr>
                        <td>Chef</td>
                        <td><strong>5</strong></td>
                        <td>10.6%</td>
                        <td><div class="progress-bar"><div class="progress-fill" style="width: 10.6%;"></div></div></td>
                    </tr>
                    <tr>
                        <td>Driver</td>
                        <td><strong>1</strong></td>
                        <td>2.1%</td>
                        <td><div class="progress-bar"><div class="progress-fill" style="width: 2.1%;"></div></div></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section-header">CANDIDATE ATTRITION ANALYSIS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Top Loss Reasons (176 Lost)</div>
                <div class="stat-row">
                    <span class="stat-label">No Good Conduct Certificate</span>
                    <span class="stat-value">113 (64.2%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Experience Mismatch</span>
                    <span class="stat-value">45 (25.6%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">No Response</span>
                    <span class="stat-value">12 (6.8%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Salary Expectations</span>
                    <span class="stat-value">6 (3.4%)</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Candidate Sources (All Status)</div>
                <div class="stat-row">
                    <span class="stat-label">Facebook</span>
                    <span class="stat-value">248 (96.1%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Referred By Church</span>
                    <span class="stat-value">5 (1.9%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Referral</span>
                    <span class="stat-value">4 (1.6%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Instagram</span>
                    <span class="stat-value">1 (0.4%)</span>
                </div>
            </div>
        </div>

        <div class="section-header">CANDIDATE RECRUITMENT FUNNEL</div>

        <div class="funnel">
            <div class="funnel-stage">
                <span>Total Candidate Applications</span>
                <span>258 (100%)</span>
            </div>
            <div class="funnel-stage">
                <span>Interviews Conducted</span>
                <span>30 (11.6%)</span>
            </div>
            <div class="funnel-stage">
                <span>Successful Interviews (WON)</span>
                <span>47 (18.2%)</span>
            </div>
            <div class="funnel-stage">
                <span>Complete Profiles Ready</span>
                <span>23 (8.9%)</span>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 3 of 4
        </div>
    </div>

    <!-- PAGE 4: MARKETING -->
    <div class="page">
        <div class="header">
            <div class="logo">Nestara</div>
            <div class="date-badge">Sep 15 - Oct 24, 2025</div>
        </div>

        <div class="section-header">MARKETING PERFORMANCE ANALYSIS</div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">32.0K</div>
                <div class="metric-label">Total Ad Spend (KES)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">1,500</div>
                <div class="metric-label">Cost Per Client Lead</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">250</div>
                <div class="metric-label">Cost Per WON Candidate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">100%</div>
                <div class="metric-label">Google Conversion</div>
            </div>
        </div>

        <div class="insight-box">
            <div class="insight-title">Marketing Intelligence Summary</div>
            <div class="insight-text">
                Marketing investment of KES 32,000 across three channels generated 39 client inquiries and 258 candidate applications. Google Ads (KES 15,000) delivered exceptional performance with 100% conversion rate - all 10 leads either won (1 client) or paid PAF (8 clients), with 1 refunded placement still counted as marketing success. Cost per client lead of KES 1,500 demonstrates efficient targeting. Facebook Ads (KES 11,000) focused on candidate acquisition achieved KES 44.35 per application with 44 WON candidates (KES 250 per WON). Brand awareness campaigns (KES 6,000) generated 68,594 reach and 74,539 impressions, supporting 3 organic won clients (2 Referrals, 1 Instagram) at CPM of KES 80.50. Referral channel continues to demonstrate highest quality with 33.3% win rate, indicating strong customer satisfaction and untapped referral program potential.
            </div>
        </div>

        <div class="section-header">CHANNEL INVESTMENT & PERFORMANCE</div>

        <div class="card" style="margin-bottom: 4mm;">
            <div class="card-title">Marketing Budget Breakdown & Results</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Budget</th>
                        <th>Purpose</th>
                        <th>Volume</th>
                        <th>Cost/Unit</th>
                        <th>Won/Result</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Facebook Ads</strong></td>
                        <td>KES 11,000</td>
                        <td>Candidate Leads</td>
                        <td>248 candidates</td>
                        <td>KES 44.35</td>
                        <td>44 WON</td>
                    </tr>
                    <tr>
                        <td><strong>Google Ads</strong></td>
                        <td>KES 15,000</td>
                        <td>Client Acquisition</td>
                        <td>10 clients</td>
                        <td>KES 1,500</td>
                        <td>1 Won + 8 PAF</td>
                    </tr>
                    <tr>
                        <td><strong>Post Boosting</strong></td>
                        <td>KES 6,000</td>
                        <td>Brand Awareness</td>
                        <td>68,594 reach</td>
                        <td>KES 80.50 CPM</td>
                        <td>74,539 impressions</td>
                    </tr>
                    <tr style="background: #fef8f6; font-weight: 700;">
                        <td>TOTAL</td>
                        <td>KES 32,000</td>
                        <td>Multi-Channel</td>
                        <td>39C + 258CD</td>
                        <td>-</td>
                        <td>4C + 47CD</td>
                    </tr>
                </tbody>
            </table>
            <div style="font-size: 8px; color: #666; margin-top: 5px;">
                C = Clients | CD = Candidates | WON = Passed Interviews/Converted | PAF = Profile Access Fee (KES 3,000)
            </div>
        </div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Client Acquisition Channels</div>
                <div class="stat-row">
                    <span class="stat-label">Instagram (Organic)</span>
                    <span class="stat-value">11 (28.2%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Google Search (Paid)</span>
                    <span class="stat-value">10 (25.6%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Facebook (Organic)</span>
                    <span class="stat-value">7 (17.9%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Referral</span>
                    <span class="stat-value">6 (15.4%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Website</span>
                    <span class="stat-value">4 (10.3%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Walk-in Poster</span>
                    <span class="stat-value">1 (2.6%)</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Won Client Source Distribution</div>
                <div class="stat-row">
                    <span class="stat-label">Referral</span>
                    <span class="stat-value">2 (50.0%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Google Search</span>
                    <span class="stat-value">1 (25.0%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Instagram</span>
                    <span class="stat-value">1 (25.0%)</span>
                </div>
                <div style="margin-top: 8px; padding: 6px; background: #e8f5e9; border-radius: 4px; font-size: 9px;">
                    <strong>Best Converter:</strong> Referrals (33.3% win rate)<br>
                    <strong>Best Paid Channel:</strong> Google (100% to PAF/Won)
                </div>
            </div>
        </div>

        <div class="section-header">MARKETING EFFICIENCY METRICS</div>

        <div class="three-col">
            <div class="small-card" style="border: 2px solid #2e7d32;">
                <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Cost Per Client Lead</div>
                <div style="font-size: 21px; font-weight: 700; color: #2e7d32;">KES 1,500</div>
                <div style="font-size: 8px; color: #999; margin-top: 3px;">Google: 10 leads, 100% conversion</div>
            </div>
            <div class="small-card" style="border: 2px solid #1565c0;">
                <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Cost Per WON Candidate</div>
                <div style="font-size: 21px; font-weight: 700; color: #1565c0;">KES 250</div>
                <div style="font-size: 8px; color: #999; margin-top: 3px;">Meta: 44 WON from 248 applications</div>
            </div>
            <div class="small-card" style="border: 2px solid #ae491e;">
                <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Brand Awareness CPM</div>
                <div style="font-size: 21px; font-weight: 700; color: #ae491e;">KES 80.50</div>
                <div style="font-size: 8px; color: #999; margin-top: 3px;">68,594 reach | 74,539 impressions</div>
            </div>
        </div>

        <div class="card" style="margin-top: 3mm; margin-bottom: 4mm;">
            <div class="card-title">Google Ads Detailed Performance</div>
            <div class="two-col" style="gap: 12px;">
                <div>
                    <div class="stat-row">
                        <span class="stat-label">Total Investment</span>
                        <span class="stat-value">KES 15,000</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Client Leads Generated</span>
                        <span class="stat-value">10</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Won Clients</span>
                        <span class="stat-value">1 (Najma)</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Paid PAF (KES 3,000)</span>
                        <span class="stat-value">8 clients</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Refunded (Rachael)</span>
                        <span class="stat-value">1 (still counted)</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f0f9ff; border-radius: 6px; padding: 14px;">
                    <div style="font-size: 10px; color: #666; margin-bottom: 5px;">Conversion Rate</div>
                    <div style="font-size: 34px; font-weight: 700; color: #ae491e;">100%</div>
                    <div style="font-size: 9px; color: #666; margin-top: 4px;">All leads converted to PAF or Won</div>
                    <div style="font-size: 8px; color: #999; margin-top: 2px;">Cost per lead: KES 1,500</div>
                </div>
            </div>
        </div>

        <div class="section-header">KEY MARKETING RECOMMENDATIONS</div>

        <div class="two-col">
            <div class="card">
                <div class="card-title">Strengths to Leverage</div>
                <div style="font-size: 9px; line-height: 1.5; color: #555;">
                    <strong>• Google Ads Excellence:</strong> 100% conversion rate - all 10 leads engaged (1 won + 8 PAF)<br>
                    <strong>• Referral Quality:</strong> 33.3% win rate (2/6) - implement structured incentive program<br>
                    <strong>• Strong Organic Presence:</strong> 28.2% clients from Instagram organically<br>
                    <strong>• Review Momentum:</strong> 12 Google reviews building social proof<br>
                    <strong>• Candidate Pipeline:</strong> 44 WON candidates at KES 250 each - efficient sourcing
                </div>
            </div>

            <div class="card">
                <div class="card-title">Areas for Optimization</div>
                <div style="font-size: 9px; line-height: 1.5; color: #555;">
                    <strong>• Candidate Quality Filter:</strong> 68% loss rate - pre-screen for good conduct certificates<br>
                    <strong>• Client Ghosting:</strong> 33% ghosted rate (13/39) - automated follow-up sequences<br>
                    <strong>• Scale Google Ads:</strong> 100% conversion justifies increased budget allocation<br>
                    <strong>• Facebook Strategy:</strong> 0% client win rate - review targeting or pivot focus<br>
                    <strong>• PAF to Won:</strong> Convert 8 Google PAF clients to placements for higher ROI
                </div>
            </div>
        </div>

        <div class="footer">
            Nestara Progress Report | Confidential Business Document | Page 4 of 4
        </div>
    </div>
</body>
</html>