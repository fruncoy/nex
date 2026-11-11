# Authentication Fix Instructions

## Current Status
✅ RLS Policies are CORRECT (2 policies, properly configured)
❌ Your app is still getting 404 errors

## Root Cause
The issue is your **browser's cached JWT token** doesn't have the correct permissions. Even though the policies are fixed, your old token is still being used.

## Solution Steps (Do ALL of these)

### Step 1: Hard Refresh Browser
1. Open your app in the browser
2. Press `Ctrl + Shift + Delete` (Windows)
3. Select:
   - ✅ Cached images and files
   - ✅ Cookies and other site data
4. Time range: **Last hour**
5. Click "Clear data"

### Step 2: Clear Local Storage
1. While on your app, press `F12` to open Developer Tools
2. Go to the **Application** tab (or **Storage** in Firefox)
3. Under "Storage", expand **Local Storage**
4. Click on your app's domain (likely `localhost:5173` or your production URL)
5. Look for keys starting with `sb-` (Supabase auth tokens)
6. **Delete ALL Supabase-related keys**
7. Refresh the page

### Step 3: Force Logout and Login
1. In your app, click **Logout**
2. Close the browser tab completely
3. Open a **new browser tab** (or use Incognito/Private mode)
4. Navigate to your app
5. **Login again** (this will generate a fresh JWT token)

### Step 4: Test Import
1. Go to Niche Training page
2. Click "Import Trainees"
3. Select candidates and cohort 17
4. Try to import

## If Still Not Working

### Option A: Check JWT Token in Browser Console
1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Type this and press Enter:
```javascript
const session = await window.supabase.auth.getSession()
console.log('Current session:', session)
```
4. Check if `session.data.session` exists
5. If it's `null`, you're not logged in properly

### Option B: Test Direct Database Access
1. Go to Supabase Dashboard SQL Editor
2. Run the test query in `test_authentication.sql`
3. This will verify if the database-level permissions work

### Option C: Check Supabase Project Settings
1. Go to Supabase Dashboard → Settings → API
2. Verify:
   - ✅ Project URL matches your `.env` file
   - ✅ `anon` key matches your `.env` file
   - ✅ JWT expiry is reasonable (not expired)

### Option D: Restart Development Server
Sometimes the Vite dev server caches environment variables:
```powershell
# Stop your dev server (Ctrl+C)
# Then restart
npm run dev
```

## Emergency: Bypass RLS Temporarily (Testing Only)

**⚠️ DO NOT USE IN PRODUCTION**

If you need to test if it's purely an RLS issue:
```sql
-- Temporarily disable RLS (TESTING ONLY)
ALTER TABLE niche_training DISABLE ROW LEVEL SECURITY;

-- Test your import

-- Re-enable immediately after testing
ALTER TABLE niche_training ENABLE ROW LEVEL SECURITY;
```

## What Should Happen

After clearing cache and re-logging in:
- ✅ POST request to niche_training should return **201 Created**
- ✅ Trainees should be imported successfully
- ✅ No more 404 errors

## Still Stuck?

If none of the above works, there might be a deeper issue. Check:
1. Are you using the correct Supabase project?
2. Did the security update change the anon key?
3. Is there a proxy/firewall blocking requests?

Run this in your browser console to verify the request:
```javascript
const { data, error } = await window.supabase
  .from('niche_training')
  .select('*')
  .limit(1)

console.log('Test read:', { data, error })
```

If this works but POST doesn't, there's something specific about INSERT operations.
