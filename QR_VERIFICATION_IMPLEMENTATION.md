# QR Certificate Verification — Full Implementation Guide

**App URL:** `https://nestara.vercel.app`  
**Verification URL pattern:** `https://nestara.vercel.app/verify/<token>`

---

## What We Are Building

Every certificate and transcript will carry a QR code in the bottom-right corner.
When scanned, it opens a public page that shows the real record from your database:
name, phone, course, grade/tier, score, cohort, and dates.
A fake certificate will either have no QR code, or will fail to verify.

### QR Behaviour — Preview vs PDF

The QR code must be visible in **both** the live on-screen preview and the downloaded PDF.

- **Live preview** — The QR image is rendered inside the certificate/transcript React component
  using a `<img>` tag that is generated from a `qrcode` data URL on component mount.
  It sits in the bottom-right corner inside the existing border, small and unobtrusive.
- **PDF download** — The same QR image is already part of the DOM when `element.outerHTML`
  is captured, so it is included in the PDF automatically. No extra injection step needed.

**Sizing and style intent — subtle, not shouting:**
- QR image: `65×65px` on screen (roughly 17mm on the printed A4 page — small but scannable)
- Thin `1px` light-grey border around the QR block to frame it without drawing attention
- Caption text: `"Scan to verify"` in `6px` uppercase Poppins, `#999` grey
- Positioned: `bottom: 28px; right: 36px` — tucked inside the certificate border, away from signatures
- Background matches the certificate cream `#FAF9F6` so it blends in
- The QR itself uses dark `#1a1a1a` modules on the cream background — scannable but not stark black

---

## Overview of Changes

| # | Type | File |
|---|------|------|
| 1 | New SQL | `add_certificate_token.sql` |
| 2 | New util | `src/utils/certificateToken.ts` |
| 3 | Edit | `src/lib/supabase.ts` — add `verifyCertificateToken` function |
| 4 | Edit | `src/components/NicheCertificate.tsx` — add QR code |
| 5 | Edit | `src/components/NicheTranscript.tsx` — add QR code |
| 6 | Edit | `src/pages/NicheGrading.tsx` — pass new props to both components |
| 7 | New page | `src/pages/VerifyCertificate.tsx` |
| 8 | Edit | `src/App.tsx` — add public `/verify/:token` route |

---

## STEP 1 — Install QR Code Library

Run this in your terminal inside the `nex` folder:

```bash
npm install qrcode@1.5.4
npm install --save-dev @types/qrcode@1.5.5
```

`qrcode` generates QR codes as base64 PNG data URLs directly in the browser.
That means the QR image can be injected into the certificate HTML
before it is sent to the PDF service — no extra server needed.

---

## STEP 2 — Database Migration

Create a new file `add_certificate_token.sql` in your project root and run it in Supabase SQL Editor:

```sql
-- Add a unique, tamper-proof token to every grade record.
-- This token is what gets encoded into the QR code URL.

ALTER TABLE trainee_grades
  ADD COLUMN IF NOT EXISTS certificate_token UUID DEFAULT gen_random_uuid();

-- Backfill tokens for existing records
UPDATE trainee_grades
  SET certificate_token = gen_random_uuid()
  WHERE certificate_token IS NULL;

-- Make it required and unique going forward
ALTER TABLE trainee_grades
  ALTER COLUMN certificate_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainee_grades_certificate_token
  ON trainee_grades (certificate_token);
```

**Why a separate token and not the trainee ID?**
- The trainee `id` is an internal key — exposing it publicly is a security risk.
- A random UUID token is unguessable and can be regenerated if ever needed
  without affecting any other part of the system.

---

## STEP 3 — New Utility File

Create `src/utils/certificateToken.ts`:

```typescript
import { supabase } from '../lib/supabase'

/**
 * Returns the full public verification URL for a given grade record.
 * If the record does not yet have a certificate_token, generates one
 * and saves it to Supabase before returning the URL.
 */
export async function getOrCreateVerificationUrl(
  gradeId: string,
  existingToken?: string | null
): Promise<string> {
  const baseUrl = 'https://nestara.vercel.app'

  if (existingToken) {
    return `${baseUrl}/verify/${existingToken}`
  }

  // Generate a new token and persist it
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('trainee_grades')
    .update({ certificate_token: newToken })
    .eq('id', gradeId)

  if (error) {
    throw new Error(`Failed to save certificate token: ${error.message}`)
  }

  return `${baseUrl}/verify/${newToken}`
}
```

---

## STEP 4 — Add Supabase Query for Public Verification

In `src/lib/supabase.ts`, add this function at the bottom of the file
(before the closing of the file — after the `export const supabase = ...` block):

```typescript
/**
 * Public certificate verification — no login required.
 * Looks up a grade record by its certificate_token and returns
 * the fields needed to display on the verification page.
 */
export async function verifyCertificateToken(token: string) {
  const { data, error } = await supabase
    .from('trainee_grades')
    .select(`
      certificate_token,
      tier,
      final_score,
      training_type,
      created_at,
      niche_training (
        name,
        phone,
        course,
        role,
        date_started,
        date_completed,
        training_category
      ),
      niche_cohorts (
        cohort_number
      )
    `)
    .eq('certificate_token', token)
    .single()

  return { data, error }
}
```

**Note on Supabase RLS:**
Since you are not sure about your RLS settings, check in Supabase Dashboard:
- Go to Authentication → Policies → `trainee_grades` table
- If RLS is ON and there is no `anon` SELECT policy, the verification page
  will get a "permission denied" error for unauthenticated users.
- If that happens, add this policy in the Supabase SQL Editor:

```sql
CREATE POLICY "Public can verify certificates"
  ON trainee_grades
  FOR SELECT
  TO anon
  USING (certificate_token IS NOT NULL);
```

---

## STEP 5 — Update `NicheCertificate.tsx`

### 5a — Add new props to the interface

Find this block near the top of the file:

```typescript
interface NicheCertificateProps {
  recipientName: string
  role?: string
  ...
  onClose: () => void
  description?: string
  dateStarted?: string
  dateCompleted?: string
}
```

Add two new props at the end, before the closing `}`:

```typescript
  gradeId?: string
  certificateToken?: string | null
```

### 5b — Add the imports at the very top of the file

```typescript
import { useEffect, useState } from 'react'   // replace existing React import if useState is already imported
import QRCode from 'qrcode'
import { getOrCreateVerificationUrl } from '../utils/certificateToken'
```

> `useState` is already imported in the file. Just add the two new lines for `QRCode` and `getOrCreateVerificationUrl`.

### 5c — Add the new props to the destructuring

Find the line:
```typescript
const NicheCertificate: React.FC<NicheCertificateProps> = ({
```

Add `gradeId` and `certificateToken` to the destructured props list:
```typescript
  onClose,
  description,
  dateStarted,
  dateCompleted,
  gradeId,
  certificateToken
```

### 5d — Add state and effect for the live QR preview

After the existing `const [isDownloading, setIsDownloading] = useState(false)` line,
add these two new state variables and a `useEffect`:

```typescript
const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
const [verifyUrl, setVerifyUrl] = useState<string | null>(null)

// Generate the QR code as soon as the certificate is opened for preview.
// This means the QR is visible on screen AND captured in the PDF when downloaded.
useEffect(() => {
  if (!gradeId) return

  getOrCreateVerificationUrl(gradeId, certificateToken)
    .then((url) => {
      setVerifyUrl(url)
      return QRCode.toDataURL(url, {
        width: 130,       // generates a sharp image; displayed at 65px via CSS
        margin: 1,
        color: { dark: '#1a1a1a', light: '#FAF9F6' }  // dark modules, cream background
      })
    })
    .then((dataUrl) => setQrDataUrl(dataUrl))
    .catch((err) => console.warn('QR generation failed:', err))
}, [gradeId, certificateToken])
```

### 5e — Render the QR inside the certificate JSX

Inside the certificate card `<div>` (the one with `id="certificate-content"`),
add the QR block as the **last child** before the closing `</div>` of the card.
Position it absolutely so it sits in the bottom-right corner without displacing any layout:

```tsx
{/* QR Verification — subtle, bottom-right, inside the border */}
{qrDataUrl && (
  <div style={{
    position: 'absolute',
    bottom: 28,
    right: 36,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    zIndex: 10,
    padding: '4px',
    border: '1px solid #e0dcd5',   // very light grey frame — blends with cream bg
    borderRadius: 3,
    background: '#FAF9F6',
  }}>
    <img
      src={qrDataUrl}
      width={65}
      height={65}
      alt="Scan to verify this certificate"
      style={{ display: 'block' }}
    />
    <span style={{
      fontFamily: "'Poppins', sans-serif",
      fontSize: '6px',
      color: '#999',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      Scan to verify
    </span>
  </div>
)}
```

**Why this works for both preview and PDF:**
The QR `<img>` tag is part of the real DOM inside `#certificate-content`.
When `downloadCertificate` calls `element.outerHTML`, the base64 data URL is already
baked into the `src` attribute — the PDF service receives it as a self-contained image
and renders it identically. No separate injection needed.

### 5f — Clean up `downloadCertificate` (remove old injection logic if you added it)

The `downloadCertificate` function stays the same as it currently is.
You do **not** need the old QR injection block from the previous version of this guide.
Just capture `element.outerHTML` as normal — the QR is already in the DOM.

---

## STEP 6 — Update `NicheTranscript.tsx`

Make the **exact same changes** as Step 5 in `NicheTranscript.tsx`:

1. Add `gradeId?: string` and `certificateToken?: string | null` to `NicheTranscriptProps`
2. Add `import QRCode from 'qrcode'` and `import { getOrCreateVerificationUrl } from '../utils/certificateToken'` at the top
3. Add `gradeId` and `certificateToken` to the destructured props
4. Add the same `qrDataUrl` state, `verifyUrl` state, and `useEffect` (from Step 5d)
5. Render the same QR block JSX (from Step 5e) as the last child inside the transcript card div —
   search for the element with `id="transcript-content"` and add it before its closing `</div>`
6. The `downloadTranscript` function stays unchanged — QR is already in the DOM

The QR on the transcript encodes the **same URL** as the certificate for that trainee (same token).
An employer can scan either document and see the same verified record.

---

## STEP 7 — Update `NicheGrading.tsx`

When the `NicheCertificate` and `NicheTranscript` components are rendered,
pass the new props.

### Find where NicheCertificate is rendered

Search for `<NicheCertificate` in `NicheGrading.tsx`.
Add `gradeId` and `certificateToken` to the JSX:

```tsx
<NicheCertificate
  recipientName={...}
  {/* ... all existing props ... */}
  gradeId={selectedGradeRecord?.id}
  certificateToken={selectedGradeRecord?.certificate_token}
/>
```

### Find where NicheTranscript is rendered

Same thing:

```tsx
<NicheTranscript
  recipientName={...}
  {/* ... all existing props ... */}
  gradeId={selectedGradeRecord?.id}
  certificateToken={selectedGradeRecord?.certificate_token}
/>
```

### Make sure certificate_token is fetched from Supabase

In the `loadNicheCardData` function (or wherever you fetch the grade record),
make sure `certificate_token` is included in the select query. Find the query like:

```typescript
const { data: gradeData } = await supabase
  .from('trainee_grades')
  .select('*')
  ...
```

The `*` will include `certificate_token` automatically once the column exists.
If the select uses specific column names, add `certificate_token` to the list.

---

## STEP 8 — New Public Verification Page

Create `src/pages/VerifyCertificate.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { verifyCertificateToken } from '../lib/supabase'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

interface VerificationData {
  certificate_token: string
  tier: string | null
  final_score: number | null
  training_type: string | null
  created_at: string
  niche_training: {
    name: string
    phone: string
    course: string
    role: string
    date_started: string | null
    date_completed: string | null
    training_category: string | null
  } | null
  niche_cohorts: {
    cohort_number: number
  } | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const VerifyCertificate: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found' | 'error'>('loading')
  const [record, setRecord] = useState<VerificationData | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('not_found')
      return
    }

    verifyCertificateToken(token).then(({ data, error }) => {
      if (error || !data) {
        setStatus('not_found')
      } else {
        setRecord(data as VerificationData)
        setStatus('found')
      }
    })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF9F6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '40px 16px',
      fontFamily: "'Poppins', sans-serif"
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>
          Nestara Institute of Care and Hospitality Excellence
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#000', letterSpacing: '0.05em' }}>
          Certificate Verification
        </h1>
        <div style={{ height: 2, width: 60, background: '#d95637', margin: '12px auto 0' }} />
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#666' }}>
          <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} color="#d95637" />
          <p>Verifying certificate...</p>
        </div>
      )}

      {/* Not found / invalid */}
      {(status === 'not_found' || status === 'error') && (
        <div style={{
          background: '#fff',
          border: '2px solid #e53e3e',
          borderRadius: 12,
          padding: '32px 40px',
          textAlign: 'center',
          maxWidth: 480,
          width: '100%'
        }}>
          <XCircle size={48} color="#e53e3e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e53e3e', marginBottom: 12 }}>
            Certificate Not Verified
          </h2>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>
            This certificate could not be verified in our records.
            The document may be forged, altered, or the QR code may be invalid.
          </p>
          <p style={{ fontSize: 13, color: '#888', marginTop: 16 }}>
            To confirm authenticity, contact Nestara directly.
          </p>
        </div>
      )}

      {/* Verified */}
      {status === 'found' && record && record.niche_training && (
        <div style={{
          background: '#fff',
          border: '2px solid #38a169',
          borderRadius: 12,
          padding: '32px 40px',
          maxWidth: 520,
          width: '100%'
        }}>
          {/* Verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <CheckCircle size={40} color="#38a169" />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#38a169', margin: 0 }}>
                VERIFIED — Authentic Certificate
              </h2>
              <p style={{ fontSize: 12, color: '#888', margin: 0, marginTop: 2 }}>
                This record was found in the Nestara NICHE database
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#e2e8f0', marginBottom: 24 }} />

          {/* Details grid */}
          {[
            { label: 'Full Name', value: record.niche_training.name },
            { label: 'Phone Number', value: record.niche_training.phone || 'N/A' },
            { label: 'Course', value: record.niche_training.course || 'N/A' },
            { label: 'Role', value: record.niche_training.role || 'N/A' },
            { label: 'Training Category', value: record.niche_training.training_category || 'N/A' },
            { label: 'Grade / Tier', value: record.tier || 'Completed' },
            { label: 'Final Score', value: record.final_score !== null ? `${record.final_score.toFixed(1)} / 100` : 'N/A' },
            { label: 'Cohort', value: record.niche_cohorts ? `Cohort #${record.niche_cohorts.cohort_number}` : 'N/A' },
            { label: 'Date Started', value: formatDate(record.niche_training.date_started) },
            { label: 'Date Completed', value: formatDate(record.niche_training.date_completed) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500, minWidth: 140 }}>
                {label}
              </span>
              <span style={{
                fontSize: 13,
                color: label === 'Grade / Tier' ? '#d95637' : '#000',
                fontWeight: label === 'Grade / Tier' || label === 'Full Name' ? 700 : 400,
                textAlign: 'right'
              }}>
                {value}
              </span>
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Verified by Nestara · nestara.vercel.app
            </p>
          </div>
        </div>
      )}

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');
      `}</style>
    </div>
  )
}

export default VerifyCertificate
```

---

## STEP 9 — Add Route in `App.tsx`

### 9a — Import the new page

Add this import near the top of `App.tsx` with the other page imports:

```typescript
import VerifyCertificate from './pages/VerifyCertificate'
```

### 9b — Add the public route

The `/verify/:token` route must be **outside** the `ProtectedLayout` wrapper
so that unauthenticated users (employers, clients) can access it.

Inside `AppRoutes`, add this route **inside** `<Route element={<MemberSubdomainRedirect />}>` 
but **outside** `<Route path="/" element={<ProtectedLayout />}>`:

```tsx
<Route path="/verify/:token" element={<VerifyCertificate />} />
```

The final structure in `AppRoutes` should look like:

```tsx
<Routes>
  <Route element={<MemberSubdomainRedirect />}>
    <Route path="/createprofile" element={<CreateProfile />} />
    <Route path="/verify/:token" element={<VerifyCertificate />} />   {/* ← ADD THIS */}
    <Route path="/" element={<ProtectedLayout />}>
      {/* ... all existing protected routes ... */}
    </Route>
    <Route path="/digest" element={<ProtectedDigest />} />
    <Route path="/member" element={<MemberPortal />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route>
</Routes>
```

---

## Testing Checklist

After implementing all steps:

- [ ] Run the SQL migration in Supabase — check that `certificate_token` column exists in `trainee_grades`
- [ ] Open the app, go to Niche Grading, open a graded trainee
- [ ] Click Certificate — the QR code should appear immediately in the bottom-right corner of the **on-screen preview**, small and subtle inside the border
- [ ] The QR should not overlap the signatures or pillar score bars
- [ ] Scan the QR directly from your screen (on your phone) while the preview is open — it should open `https://nestara.vercel.app/verify/<token>`
- [ ] The verification page should show ✅ with name, phone, course, grade/tier, score, cohort, and dates
- [ ] Click Download Certificate — open the PDF and confirm the QR is visible in the same position
- [ ] Scan the QR from the PDF on your phone — same result, same verified details
- [ ] Click Transcript — same QR should appear in the transcript preview and download
- [ ] Confirm scanning the transcript QR shows the same record as the certificate QR
- [ ] Manually visit `https://nestara.vercel.app/verify/invalid-token` — should show ❌ not verified
- [ ] Open the verification URL in a private/incognito browser tab (not logged in) — should still work

---

## Notes

- The QR code URL is always `https://nestara.vercel.app/verify/<uuid>` — hardcoded since this is your production domain.
- If you ever move domains, update the `baseUrl` constant in `src/utils/certificateToken.ts`.
- The QR is generated on component mount (when the preview opens), not at grading time.
  This means the token is created the first time a trainer opens the certificate or transcript viewer for a trainee.
- Old certificates already downloaded before this feature was added will not have a QR code.
  Only documents downloaded after implementation will carry one.
- The QR is intentionally subtle — `65×65px`, cream background, light border, grey caption.
  It sits in the corner and does not interfere with the certificate design or signature lines.
  A phone camera will still scan it reliably at that size.
- Both certificate and transcript share the same token for the same trainee.
  Scanning either document shows the same verified record.
