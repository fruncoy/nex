
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
