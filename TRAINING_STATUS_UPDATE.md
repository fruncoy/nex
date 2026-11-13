# Training Status System Update

## Changes Made

### Database Level
1. **Renamed "weekend" to "shortcourse"** in training_type field
2. **Added "shortcourse" to constraint** - Updated check constraint to allow 'shortcourse' as a valid training_type
3. **Deleted duplicates** - Removed duplicate records from niche_training table
4. **Deleted Keziah** - Removed trainee without cohort assignment
5. **Fixed expelled status** - Correctly marked 19 people as expelled (5 original + 14 ungraded)
6. **Restored short courses** - Changed 11 short course participants from "Expelled" to "Completed"

### Status System

**2-Week Flagship Training** (`training_type = '2week'`)
- Status options: Active, Graduated, Expelled
- Total: 206 Graduated, 5 Expelled

**Short Course Training** (`training_type = 'shortcourse'`)
- Status options: Active, Completed
- Total: 11 Graduated, 1 Completed

### Code Updates

#### NicheTraining.tsx
1. **Updated training_type interface** - Added 'shortcourse' to type definitions
2. **Dynamic status options** - Form shows only 3 status options based on training type:
   - Short course: Active, Completed
   - 2-week: Active, Graduated, Expelled
3. **Updated default training_type** - Changed from 'weekend' to '2week'
4. **Fixed training type display** - Cards now show "Short Course" for both 'shortcourse' and 'weekend'

#### StatusBadge.tsx
- Already supports "Completed" status with purple color ✓

### Special Cases

**Jentrix Munanga (Cohort 8)**
- Status: Graduated
- Has grade: No
- Reason: Legitimate exception - graduated but not graded

**15 Graduates Without Grades**
- 14 were marked as "Expelled" (correct - they didn't complete training)
- 1 (Jentrix) kept as "Graduated" (exception)

### Final Counts

- **Total Trainees**: 227
- **2-Week Flagship**: 206 Graduated, 5 Expelled, 16 Active
- **Short Course**: 11 Graduated, 1 Completed
- **Total Expelled**: 19
- **Total Blacklisted Candidates**: 33

### Sync Function Updated

The sync function in NicheCandidates.tsx now properly handles:
- `training_type = '2week'` + status 'Graduated' → candidate 'Graduated'
- `training_type = '2week'` + status 'Expelled' → candidate 'BLACKLISTED'
- `training_type = 'shortcourse'` + status 'Completed' → candidate 'Graduated'
- `training_type = 'shortcourse'` + status 'Graduated' → candidate 'Graduated'

## Migration Steps Completed

1. ✅ Fixed training_type constraint to allow 'shortcourse'
2. ✅ Renamed 'weekend' to 'shortcourse'
3. ✅ Deleted duplicate records
4. ✅ Fixed expelled status for ungraded graduates
5. ✅ Restored short course participants to "Completed"
6. ✅ Updated NicheTraining.tsx to handle dynamic status options
7. ✅ Updated training type display logic

## Next Steps

1. Grade the remaining graduates without grades (if any new ones)
2. Monitor sync function to ensure candidates stay synchronized
3. Consider adding grade validation before allowing "Graduated" status
