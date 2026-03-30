-- Clear existing criteria and add all complete criteria from README

-- Delete existing criteria
DELETE FROM criteria;

-- Insert all criteria from the complete assessment framework
INSERT INTO criteria (pillar_id, name, why_it_matters, how_to_assess, interviewer_question, criterion_weight, is_critical, guidance_1, guidance_2, guidance_3, guidance_4, guidance_5, red_flag_hints, display_order)
SELECT 
  p.id,
  'Daily routine & structure',
  'Predictable days make children feel safe and calm.',
  'Ask for a simple day plan by age; listen for meals, naps, play, hygiene, and quiet time.',
  'Give a simple day plan for a toddler (morning→evening). Include meal times, nap times, active play, quiet time, and hygiene. Say how you adjust if the child is sick or fussy.',
  0.25,
  FALSE,
  'Vague; misses naps/meals; relies on TV; no plan for changes.',
  'Some structure, but missing one block (e.g., no nap plan) or times unrealistic.',
  'Includes meals, naps, play, hygiene; roughly sensible times; some flexibility.',
  'Structured schedule with small contingencies (rainy day, travel), gentle transitions.',
  'Clear timeline with age‑fit play, quiet/reading, outdoor time; explains adjustments (illness, bad day); mentions parent preferences.',
  '"I just follow the child"; TV as schedule; no plan for conflicts.',
  1
FROM pillars p WHERE p.name = 'Childcare & Development'
UNION ALL
SELECT 
  p.id,
  'Age-appropriate play & learning',
  'Right activities support development and reduce screen time.',
  'Ask for 3 screen‑free activities for a named age and why they help.',
  'Name three screen‑free activities for a preschooler and tell me why each helps the child.',
  0.25,
  FALSE,
  'Unsafe/age‑inappropriate ideas; no reasons; only screens.',
  'Two good ideas with brief reasons; third is weak.',
  'Simple crafts, stories, outdoor play; one basic reason.',
  'Adds self‑help skills, turn‑taking; adapts for shy/active child.',
  'Varied (fine/gross motor, language, social); clear reason for each.',
  'Unsupervised risky play; rote drilling only; poor supervision.',
  2
FROM pillars p WHERE p.name = 'Childcare & Development'
UNION ALL
SELECT 
  p.id,
  'Sleep & soothing',
  'Good sleep keeps children healthy; calm routines reduce conflict.',
  'Ask bedtime steps and how to handle night wake‑ups.',
  'How would you help a 4‑year‑old who resists bedtime? Tell me your steps and how you handle wake‑ups.',
  0.25,
  TRUE,
  'Uses threats/TV; no routine; inconsistent; escalates conflict.',
  'Has routine but allows occasional screen; unsure about consistency at 2am.',
  'Simple routine (wash, story, lights out); calm voice; repeats steps.',
  'Mentions sleep environment, soothing objects, regressions and reset plan.',
  'Consistent routine, no sugar/screens pre‑bed, choices, gentle return‑to‑bed; knows when to escalate to parent.',
  'Suggests sedatives without approval; locks child in; shames.',
  3
FROM pillars p WHERE p.name = 'Childcare & Development'
UNION ALL
SELECT 
  p.id,
  'Hygiene & toilet/diaper care',
  'Clean habits prevent infections and rashes; positive tone builds independence.',
  'Ask step‑by‑step diaper/potty method and handwashing.',
  'Explain your diaper change or potty support steps, including hygiene and how you talk to the child.',
  0.25,
  FALSE,
  'Skips handwashing/surface clean; unsafe disposal; harsh talk.',
  'Forgets one hygiene step or weak child communication.',
  'Basic steps: prepare area, wipe front‑to‑back, cream if needed, wash hands.',
  'Adds travel kit plan; handles accidents calmly; fluids/fiber reminders.',
  'Full routine, checks rashes, cleans surfaces/tools, praises effort, records patterns.',
  'Reuses dirty wipes/cloths; leaves soiled items accessible; shames.',
  4
FROM pillars p WHERE p.name = 'Childcare & Development'
UNION ALL
SELECT 
  p.id,
  'Home & outdoor safety',
  'Spotting hazards prevents injuries.',
  'Give a room/outing and ask for 3 risks and fixes.',
  'You''re with a crawling baby in a sitting room—name three dangers and what you''d do. Add one outdoor risk and fix.',
  0.25,
  TRUE,
  'Misses obvious hazards; unsafe fixes; says ''watch only''.',
  'Two solid hazards, one weak; partly correct fixes.',
  'Outlets, sharp edges, choking items; simple fixes (cover, move, supervise).',
  'Furniture anchoring, hot liquids, stair gates, road safety steps.',
  'Adds cords/windows/bath risks; safe zones; continuous supervision; explains why.',
  '"Child will learn by falling"; walkers near stairs; water buckets left.',
  1
FROM pillars p WHERE p.name = 'Safety & First Aid'
UNION ALL
SELECT 
  p.id,
  'Emergency response',
  'Fast, calm action reduces harm.',
  'Ask DRSABC basics and who to call first in Kenya.',
  'A child is unresponsive. What are your first steps? When do you call 999 and the parent?',
  0.25,
  TRUE,
  'Panics; wrong order; delays help; no contacts.',
  'Knows most steps but hesitates on 999 vs parent order.',
  'Danger, shout for help, open airway, check breathing; call parent.',
  'Recovery position if breathing; stays on call, monitors.',
  'Full DRSABC; call 999 & parent; CPR if not breathing; keep time/info.',
  'Shakes child; unknown meds; filming instead of acting.',
  2
FROM pillars p WHERE p.name = 'Safety & First Aid'
UNION ALL
SELECT 
  p.id,
  'Basic first aid',
  'Simple care for fever, burns, cuts; knows when to escalate.',
  'Ask fever response and when to seek care.',
  'A child has 39.5°C fever. What do you do? When do you escalate to clinic?',
  0.25,
  TRUE,
  'Alcohol rubs; adult meds; delays help.',
  'Mostly correct but unsure on red flags/dosing.',
  'Check temp correctly, fluids, light clothing, inform parent, monitor.',
  'Dose by parent/label, log temps, comfort care; avoids aspirin.',
  'Knows red flags (lethargy, convulsions), only parent‑approved meds, when to go to clinic.',
  'Antibiotics at home; cold baths; ignores seizures.',
  3
FROM pillars p WHERE p.name = 'Safety & First Aid'
UNION ALL
SELECT 
  p.id,
  'Food hygiene & allergies',
  'Clean prep and allergy care prevent illness and reactions.',
  'Ask cross‑contamination steps and label checks.',
  'How do you cook for a child with a nut allergy? Tell me how you avoid cross‑contamination.',
  0.25,
  TRUE,
  'Uses nut items; no label checks; shared utensils.',
  'Does most steps but forgets one barrier (e.g., separate sponge).',
  'Avoid nuts, read labels, separate utensils, clean surfaces; inform parent.',
  'Separate prep area, sealed storage, checks ''may contain'' advisories.',
  'Understands hidden allergens, storage rules, handwashing; knows EpiPen handover.',
  '"A little is fine"; tries new foods unapproved; dismisses reactions.',
  4
FROM pillars p WHERE p.name = 'Safety & First Aid'
UNION ALL
SELECT 
  p.id,
  'Balanced meals',
  'Balanced food supports growth; variety reduces fussiness.',
  'Ask for a simple 2‑day menu for an age.',
  'Share a simple 2‑day menu for a school‑age child. Include breakfast, lunch, dinner and a snack each day.',
  0.34,
  FALSE,
  'Unbalanced (fried/carbs only); no veg/fruit; sugary drinks.',
  'Balanced day one; day two weak on veg or fruit.',
  'Veg/fruit, protein, whole grains, water; reasonable portions.',
  'Lunchbox ideas, hydration plan, prep tips (batch soup/rice).',
  'Variety across days; planned snacks; limits sugar; adapts to culture/allergies.',
  'Unsafe foods for age; energy drinks; ignores allergies.',
  1
FROM pillars p WHERE p.name = 'Cooking & Nutrition'
UNION ALL
SELECT 
  p.id,
  'Choking-risk awareness',
  'Safe textures prevent choking, especially for toddlers.',
  'Ask how to serve a risky food safely.',
  'How would you serve carrots to a toddler safely? Include texture and supervision.',
  0.33,
  TRUE,
  'Raw rounds; leaves child alone; running while eating.',
  'Softens food but forgets seating or supervision.',
  'Cook soft, cut small; close supervision; seated eating.',
  'Cut lengthwise → thin sticks; check temperature; no distractions while eating.',
  'Child upright, avoid whole nuts/hard foods; knows first‑aid response.',
  'Gives whole hard foods; allows walking/eating; confuses gag vs choke.',
  2
FROM pillars p WHERE p.name = 'Cooking & Nutrition'
UNION ALL
SELECT 
  p.id,
  'Meal planning & kitchen hygiene',
  'Planning saves time and keeps the kitchen safe and clean.',
  'Ask batch‑prep, storage, and clean‑as‑you‑go steps.',
  'How do you plan weekly meals and keep the kitchen clean? Include storage and ''clean as you go''.',
  0.33,
  FALSE,
  'No plan; dirty surfaces; unsafe storage; mixes raw/cooked.',
  'Has plan but forgets dating/labeling or cross‑contamination step.',
  'Simple plan, label & date, wipe surfaces, separate raw/cooked.',
  'Fridge zones, reheating rules, thaw in fridge, leftovers window.',
  'Weekly plan from parent''s list; batch‑cook; FIFO storage; sanitise boards/sponges.',
  'Leaves food out >2 hrs; refreezes cooked leftovers; same board raw/cooked.',
  3
FROM pillars p WHERE p.name = 'Cooking & Nutrition'
UNION ALL
SELECT 
  p.id,
  'Child-area cleanliness',
  'Clean play areas reduce sickness and clutter; safer for explorers.',
  'Ask daily tidy vs weekly deep‑clean routine.',
  'How do you keep play areas clean on a busy day? Tell me your daily quick tidy and weekly deep clean.',
  0.34,
  FALSE,
  'Rare tidy; mixes dirty/clean toys; seldom wipes.',
  'Tidies daily but deep‑clean plan thin/irregular.',
  'Tidy basket, wipe high‑touch items; weekly deep clean.',
  'Timer methods, end‑of‑day sweep, age‑fit child jobs.',
  'Zones/routines; safe disinfectant; soft‑toys laundry; involve child age‑appropriately.',
  'Harsh chemicals near child; sprays near food; leaves choking debris.',
  1
FROM pillars p WHERE p.name = 'Home Standards & Housekeeping'
UNION ALL
SELECT 
  p.id,
  'Safe cleaning practices',
  'Right products protect children and surfaces.',
  'Ask products near infants and storage/ventilation.',
  'What cleaners would you use around an infant? How do you store and ventilate?',
  0.33,
  TRUE,
  'Strong bleach near baby; poor storage; mixes chemicals.',
  'Mostly safe but forgets ventilation or PPE.',
  'Mild/child‑safe; dilute correctly; lock away; rinse well.',
  'Product‑by‑surface choices; spray away from child; gloves for harsh agents.',
  'Reads labels, tests small area, ventilates; separate cloths; never mix chemicals.',
  'Unlabeled decants; within child reach; bleach+ammonia mix.',
  2
FROM pillars p WHERE p.name = 'Home Standards & Housekeeping'
UNION ALL
SELECT 
  p.id,
  'Time management',
  'Prioritising keeps the home running during childcare.',
  'Ask how they juggle tasks when everything is urgent.',
  'When everything is urgent, what do you do first? How do you communicate with parents?',
  0.33,
  FALSE,
  'Panics; tries everything; no communication.',
  'Right order but forgets to confirm priorities with parent.',
  'Child safety/needs first, then quick wins; tell parent trade‑offs.',
  'Stop‑start strategy, schedule around naps, reminders for key tasks.',
  'Blocks, batch tasks, checklists; reset when child settles; updates parent.',
  'Leaves child unattended for chores; hides delays; overpromises.',
  3
FROM pillars p WHERE p.name = 'Home Standards & Housekeeping'
UNION ALL
SELECT 
  p.id,
  'Sorting & fabric care',
  'Right sorting prevents damage and colour run.',
  'Ask labels, whites/colours/delicates handling.',
  'How do you handle whites, colours, and delicates? Include temperatures and label checks.',
  0.34,
  FALSE,
  'Mixes loads; wrong temps; ignores labels.',
  'Sorts well but forgets temp nuance or label symbols.',
  'Sort by colour/fabric; correct temp; read labels.',
  'Pre‑test bright colours, inside‑out, zip closures.',
  'Mesh bags, gentle cycles, air‑dry delicates; check colour‑bleed first.',
  'Hot wash delicates; bleach on colours; shrinks wool/silk.',
  1
FROM pillars p WHERE p.name = 'Laundry & Garment Care'
UNION ALL
SELECT 
  p.id,
  'Stain treatment',
  'Quick, correct treatment saves clothes.',
  'Ask steps for common stains (grass/food/ink).',
  'How do you remove grass or food stains from uniforms? Tell me your steps.',
  0.33,
  FALSE,
  'Scrubs harshly; hot water sets stain; random chemicals.',
  'Forgets test area or check before drying.',
  'Blot, pre‑treat, soak, wash; check before drying.',
  'Enzyme soaks, oxygen bleach for whites, sunlight for safe fabrics.',
  'Agents by stain type; test small area; repeat gently; avoid heat until gone.',
  'Bleach directly; tumble‑dries set stains; damages fabric.',
  2
FROM pillars p WHERE p.name = 'Laundry & Garment Care'
UNION ALL
SELECT 
  p.id,
  'Ironing & finishing',
  'Neat finishing reflects high standards and comfort.',
  'Ask sequence and temperature choice.',
  'Walk me through ironing a cotton shirt from start to finish.',
  0.33,
  FALSE,
  'Wrong temp; shiny marks; creases left.',
  'Sequence OK but misses steam or cooling/hanging step.',
  'Right heat; steam if needed; collar‑cuffs‑sleeves‑body; hang promptly.',
  'Spray bottle for stubborn creases; tip of iron for corners; avoid prints.',
  'Press cloth, check label first, shape on hanger; safe iron storage.',
  'Irons on decorated areas; iron face‑down; burns fabric.',
  3
FROM pillars p WHERE p.name = 'Laundry & Garment Care'
UNION ALL
SELECT 
  p.id,
  'Updates to parents',
  'Short, clear updates build trust and avoid surprises.',
  'Ask when/how they report; what they include.',
  'How will you keep parents updated during the day? When do you update and what do you include?',
  0.34,
  FALSE,
  'No plan; overshares/spams; hides issues.',
  'Has cadence but content is vague or misses key info.',
  'Morning handover; short WhatsApp; one midday; emergencies immediately.',
  'End‑of‑day summary; photo proof if allowed; timing sensitivity.',
  'Tailors to preference; simple log (food/naps/mood); flags issues with options.',
  'Photos without consent; posts online; argues in chat.',
  1
FROM pillars p WHERE p.name = 'Communication & Interpersonal'
UNION ALL
SELECT 
  p.id,
  'Listening & following instructions',
  'Good listening keeps care consistent and safe.',
  'Ask how they confirm instructions and show proof.',
  'How do you make sure you understood new instructions? How will you prove you followed them?',
  0.33,
  FALSE,
  'Just says ''OK'' and guesses; forgets steps.',
  'Repeats back but forgets reminders or deadline.',
  'Repeat back steps; write notes; one clarifying question.',
  'Checklist, labels, double‑check before acting; follow‑up after.',
  'Summarise, set reminders, confirm timing, share photo proof if needed.',
  'Acts without clarity; changes rules; blames others.',
  2
FROM pillars p WHERE p.name = 'Communication & Interpersonal'
UNION ALL
SELECT 
  p.id,
  'Boundaries & confidentiality',
  'Privacy protects the family and child.',
  'Ask about photos, visitors, private info handling.',
  'Would you post a child''s photo if asked? Why/why not? What is your rule on visitors and private info?',
  0.33,
  TRUE,
  'Says yes to posting; invites visitors; shares private details.',
  'Understands consent but unsure on location/metadata or visitors.',
  'Only with parent consent and house rules; no location sharing.',
  'Secure storage of numbers, no screenshots/forwards; asks permission each time.',
  'Declines politely; follows written policy; no gossip or posting.',
  'Publishes for ''portfolio''; jokes about family online; records secretly.',
  3
FROM pillars p WHERE p.name = 'Communication & Interpersonal'
UNION ALL
SELECT 
  p.id,
  'Punctuality & reliability',
  'Reliability reduces household stress and planning risk.',
  'Ask what they do if they''ll be late; backup plans.',
  'If you''ll be late, what do you do? Mention notification, ETA, and backup plans.',
  0.34,
  FALSE,
  'No notice; repeats lateness; excuses.',
  'Usually notifies but lacks backup or follow‑through.',
  'Call/text early, give ETA, make up time if asked.',
  'Transport buffers, alarms, contingency contact.',
  'Backup route/plan; rare lateness with proof; logs time made up.',
  'No‑shows; phone off; blames without solution.',
  1
FROM pillars p WHERE p.name = 'Professionalism & Integrity'
UNION ALL
SELECT 
  p.id,
  'Honesty & accountability',
  'Owning mistakes keeps long‑term trust and safety.',
  'Ask about accidental damage scenario and follow‑up.',
  'If you break something, how do you handle it? What do you do after?',
  0.33,
  TRUE,
  'Hides it; blames others; lies.',
  'Reports but vague on remedy or prevention.',
  'Report immediately, apologise, explain, offer to help fix.',
  'Cost awareness, incident log, check‑in next day.',
  'Send photo, suggest solution, prevent repeat, accept consequence.',
  'Deletes evidence; shifts blame; repeats mistake.',
  2
FROM pillars p WHERE p.name = 'Professionalism & Integrity'
UNION ALL
SELECT 
  p.id,
  'Policy adherence',
  'Following house rules keeps focus and safety.',
  'Ask about phone use/visitors at work; emergency rules.',
  'What''s your approach to phone use while working? And what about visitors?',
  0.33,
  FALSE,
  'On phone often; ignores rules; brings visitors.',
  'Mostly follows, but unclear on emergency exceptions.',
  'Phone away during care; short checks on breaks; emergencies only.',
  'Do Not Disturb, log calls, ask permission for exceptions.',
  'Silence/lock phone; share emergency contacts; follow written rules exactly.',
  'Live‑streaming/recording; personal calls during care; frequent visitors.',
  3
FROM pillars p WHERE p.name = 'Professionalism & Integrity'
UNION ALL
SELECT 
  p.id,
  'Calm under pressure',
  'Calm responses stop problems growing and keep children safe.',
  'Ask about tantrum/sibling conflict with steps taken.',
  'Tell me about a time you stayed calm with a tantrum. What steps did you take?',
  0.34,
  TRUE,
  'Shouts or threatens; rough handling; gives up.',
  'Mostly calm but forgets naming feelings or choices.',
  'Breathes, names feelings, offers simple choices; stays kind.',
  'Safety first, cool‑down space, consistent follow‑through.',
  'Predicts triggers, prepares activities, low voice, de‑escalates; reflects later.',
  'Physical punishment; humiliation; long isolation.',
  1
FROM pillars p WHERE p.name = 'Attitude & Emotional Management'
UNION ALL
SELECT 
  p.id,
  'Receptive to feedback',
  'Feedback helps improve care quickly and respectfully.',
  'Ask about feedback received and applied changes.',
  'Tell me about feedback you received and what you changed afterwards.',
  0.33,
  FALSE,
  'Defensive; denies; no change.',
  'Accepts feedback but no follow‑up confirmation.',
  'Listens, thanks, tries change same day; updates parent.',
  'Tracks improvement, asks for re‑feedback, documents routine.',
  'Asks for examples, writes plan, checks back after a week with results.',
  'Blames parent/child; argues; repeats behaviour.',
  2
FROM pillars p WHERE p.name = 'Attitude & Emotional Management'
UNION ALL
SELECT 
  p.id,
  'Positive, proactive mindset',
  'Looking ahead prevents small issues becoming big problems.',
  'Ask about fixing a small household problem early.',
  'Describe a time you solved a small problem early before it grew.',
  0.33,
  FALSE,
  'Ignores issue; waits for parent for everything.',
  'Suggests fix but forgets to confirm or document.',
  'Spots issue, suggests one option, confirms OK, fixes safely.',
  'Pattern spotting, quick wins, reminder to monitor.',
  'Offers 2–3 safe options, explains pros/cons, fixes and documents; prevents repeat.',
  'Takes risky shortcuts; spends family money without consent.',
  3
FROM pillars p WHERE p.name = 'Attitude & Emotional Management';