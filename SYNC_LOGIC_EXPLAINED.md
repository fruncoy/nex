# Status Synchronization Logic - How the 3 Tables Work

## Master Table: `niche_candidates`
- **Everyone exists here** (master record)
- Contains all candidates who have ever been in the system

## Table Relationships & Status Sync Rules:

### 1. NICHE TRAINING → NICHE CANDIDATES
**What triggers it:** When a trainee status changes in `niche_training`
**What it affects:** `niche_candidates` status

| Training Status Change | Candidates Status Change |
|------------------------|--------------------------|
| Status → "Expelled" | Status → "BLACKLISTED" |
| Status → "Graduated" | Status → "Graduated" (if not already BLACKLISTED) |
| Status → "Active" | Status → "Active in Training" (if applicable) |

**Important:** Training graduation/completion is PRESERVED. Later blacklisting doesn't change it.

---

### 2. NICHE CANDIDATES → NEWSTAFF_MEMBERS (Bidirectional)
**What triggers it:** When candidate status changes in `niche_candidates`
**What it affects:** `newstaff_members` employment_status

| Candidates Status Change | Staff Status Change |
|--------------------------|---------------------|
| Status → "BLACKLISTED" | employment_status → "Blacklisted" |
| Status → "Qualified" (or other) | employment_status → "Yet to be Employed" |

**Bidirectional:** Changes in staff also update candidates (see below)

---

### 3. NEWSTAFF_MEMBERS → NICHE CANDIDATES (Bidirectional)
**What triggers it:** When employment status changes in `newstaff_members`
**What it affects:** `niche_candidates` status

| Staff Status Change | Candidates Status Change |
|---------------------|--------------------------|
| employment_status → "Blacklisted" | status → "BLACKLISTED" |
| employment_status → "Yet to be Employed" | status → "Qualified" |

**Important:** Does NOT touch `niche_training`. Graduated trainees stay Graduated.

---

### 4. SYNC GRADUATES TO STAFF (Manual Function)
**What triggers it:** When you click "Import Graduates" button in Staff Management
**What it does:**
1. Syncs "Graduated" trainees from `niche_training` → creates new staff members with status "Yet to be Employed"
2. Syncs "BLACKLISTED" candidates → creates new staff members with status "Blacklisted"
3. Updates existing staff member info (name, role, preserves "Employed" status)

**Important:** This is MANUAL, not automatic. You need to click the button to sync.

---

### 5. GRADUATE IN NICHE TRAINING → SYNCED TO STAFF
**What triggers it:** MANUAL - Click "Import Graduates" button
**What it affects:** Creates/updates `newstaff_members`

| Training Status | Staff Status Created |
|-----------------|---------------------|
| Graduated | "Yet to be Employed" |
| Expelled | Not added to staff (already blacklisted in candidates) |

**Note:** Existing "Employed" status is preserved. Only "Yet to be Employed" staff get updated.

---

## What DOES NOT Change:

❌ **Blacklisting in Staff Management** does NOT change Niche Training status
- Example: Graduate → Blacklisted in staff → Training stays "Graduated"

❌ **Graduation in Training** is never overwritten by blacklist
- Example: Graduated → Later blacklisted → Training stays "Graduated"

❌ **Employment status in Staff** is preserved
- Example: "Employed" stays "Employed" even when synced

---

## Summary Flow:

```
NICHE TRAINING (Academic Status)
    ↓ (Expelled only)
    ↓
NICHE CANDIDATES (Master Record)
    ↕ (Bidirectional sync for blacklist)
    ↓
NEWSTAFF_MEMBERS (Employment Status)
```

**Key Rules:**
1. Niche Candidates is the master table
2. Expelled in training → Blacklisted in candidates
3. Blacklisted in staff → Blacklisted in candidates
4. Blacklisted in candidates → Blacklisted in staff
5. **Graduated in training is PRESERVED** (never changed by blacklist)
