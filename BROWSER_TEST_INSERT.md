# Browser Console Test for INSERT Issue

## Problem
- SELECT works ✅
- INSERT fails with 404 ❌
- Error: `relation "niche_training" does not exist`

This suggests a **specific INSERT permission issue**, not a general RLS problem.

## Test in Browser Console (F12)

### Test 1: Simple Insert
```javascript
const { data, error } = await window.supabase
  .from('niche_training')
  .insert({
    name: 'Test User',
    status: 'Active',
    created_by: 'Test',
    updated_by: 'Test'
  })
  .select()

console.log('Simple insert:', error ? '❌ ' + error.message : '✅ Success!', data)
```

### Test 2: Full Insert (What Your App Does)
```javascript
// First get a cohort ID
const { data: cohorts } = await window.supabase
  .from('niche_cohorts')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1)

const cohortId = cohorts[0].id

// Now try the full insert
const { data, error } = await window.supabase
  .from('niche_training')
  .insert({
    candidate_id: null,
    name: 'Test Full',
    phone: '0700000000',
    role: 'Nanny',
    status: 'Active',
    course: 'Professional Nanny Training Program',
    cohort_id: cohortId,
    training_type: '2week',
    training_category: '2-Week Flagship',
    enrolled_courses: null,
    created_by: 'Test',
    updated_by: 'Test'
  })
  .select()

console.log('Full insert:', error ? '❌ ' + error.message : '✅ Success!', data)
```

### Test 3: Check Columns Exist
```javascript
// This will help identify if columns are missing
const testData = {
  candidate_id: null,
  name: 'Test',
  phone: '0700000000',
  role: 'Nanny',
  status: 'Active',
  course: 'Test Course',
  training_type: '2week',
  training_category: '2-Week Flagship',
  enrolled_courses: null,
  created_by: 'Test',
  updated_by: 'Test'
}

console.log('Testing these columns:', Object.keys(testData))

const { data, error } = await window.supabase
  .from('niche_training')
  .insert(testData)
  .select()

if (error) {
  console.error('❌ Failed:', error)
  console.log('Error code:', error.code)
  console.log('Error details:', error.details)
  console.log('Error hint:', error.hint)
} else {
  console.log('✅ Success! Inserted:', data)
  
  // Clean up the test record
  await window.supabase
    .from('niche_training')
    .delete()
    .eq('id', data[0].id)
  console.log('Test record deleted')
}
```

## What To Look For

### If Test 1 (Simple) Works:
Problem is with specific columns like `training_type`, `training_category`, or `enrolled_courses`.

### If Test 1 Fails:
Problem is with INSERT permission itself, even with minimal columns.

### If Error Code is:
- `42P01` - Table doesn't exist (but we know it does - this is RLS blocking)
- `42703` - Column doesn't exist
- `42501` - Permission denied
- `23502` - NOT NULL violation

## Next Steps Based on Results

Share the console output with me and I'll tell you exactly what to fix!
