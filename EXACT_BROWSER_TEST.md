# Exact Test - Match Your App's Insert

Since SELECT works but INSERT fails, and we see `?columns=...` in the URL, there might be something specific about how the insert is being called.

## Test the EXACT insert your app is doing

Copy this into browser console (F12):

```javascript
// Get cohort ID
const { data: cohorts } = await window.supabase
  .from('niche_cohorts')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1)

const cohortId = cohorts[0].id
console.log('Testing with cohort:', cohortId)

// Create test record exactly like your app does
const trainingRecords = [{
  candidate_id: null,
  name: 'Browser Test User',
  phone: '0700000000',
  role: 'Nanny',
  status: 'Active',
  course: 'Professional Nanny Training Program',
  cohort_id: cohortId,
  training_type: '2week',
  training_category: '2-Week Flagship',
  enrolled_courses: null,
  created_by: 'Browser Test',
  updated_by: 'Browser Test'
}]

console.log('Inserting:', trainingRecords)

// Insert WITHOUT .select() (like your app)
const { data, error } = await window.supabase
  .from('niche_training')
  .insert(trainingRecords)

if (error) {
  console.error('❌ Failed:', error)
  console.log('Error code:', error.code)
  console.log('Error message:', error.message)
  console.log('Error details:', error.details)
  console.log('Error hint:', error.hint)
} else {
  console.log('✅ INSERT SUCCESS!')
  console.log('Response:', data)
}
```

## What We're Testing

Your app does:
```javascript
await supabase.from('niche_training').insert(trainingRecords)
```

WITHOUT `.select()` at the end.

The `?columns=...` in the error URL is suspicious - it shouldn't be there for a basic insert.

## If This Test Passes But App Still Fails

Then something in your component is interfering. Possible causes:

1. **Stale browser bundle** - Vite cached old code
2. **React state issue** - Data being modified before insert
3. **Middleware/interceptor** - Something modifying the request

### Fix: Clear Vite Cache and Rebuild

```powershell
# Stop your dev server (Ctrl+C)

# Clear Vite cache
Remove-Item -Recurse -Force node_modules\.vite

# Restart dev server
npm run dev
```

Then try the app import again in a fresh browser tab.
