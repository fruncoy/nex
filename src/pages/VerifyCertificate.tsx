import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { verifyCertificateToken } from '../lib/supabase'
import { supabase } from '../lib/supabase'
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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function logScan(token: string, traineeName?: string) {
  try {
    await supabase.from('certificate_scan_logs').insert({
      cert_token: token,
      trainee_name: traineeName || null,
      user_agent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || null,
    })
  } catch (err) {
    // Scan logging is best-effort — never block the verification display
    console.warn('Scan log failed:', err)
  }
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
        // Log failed scans too — useful for spotting forgery attempts
        logScan(token)
      } else {
        const rec = data as VerificationData
        setRecord(rec)
        setStatus('found')
        logScan(token, rec.niche_training?.name)
      }
    })
  }, [token])

  const trainee = record?.niche_training
  const waMessage = trainee
    ? encodeURIComponent(`I have just scanned to verify ${trainee.name} for ${trainee.course || 'a course'}.`)
    : ''

  const rows = record?.niche_training
    ? [
        { label: 'Full Name',     value: record.niche_training.name },
        { label: 'Phone Number',  value: record.niche_training.phone || 'N/A' },
        { label: 'Course',        value: record.niche_training.course || 'N/A' },
        { label: 'Grade / Tier',  value: record.tier || 'Completed' },
        {
          label: 'Final Score',
          value: record.final_score !== null ? `${record.final_score.toFixed(1)} / 100` : 'N/A',
        },
        {
          label: 'Cohort',
          value: record.niche_cohorts ? `Cohort #${record.niche_cohorts.cohort_number}` : 'N/A',
        },
        { label: 'Date Started',   value: formatDate(record.niche_training.date_started) },
        { label: 'Date Completed', value: formatDate(record.niche_training.date_completed) },
      ]
    : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 16px 80px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        {/* Watermark background — both logos tiled, 10% opacity */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url("/NICHE Logo.png"), url("/Logo.png")',
          backgroundSize: '110px 110px, 90px 90px',
          backgroundRepeat: 'repeat, repeat',
          backgroundPosition: '0 0, 120px 120px',
          opacity: 0.10,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* All page content sits above the watermark */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: 10,
          }}>
            Nestara Institute of Care and Hospitality Excellence
          </p>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#111',
            letterSpacing: '0.04em',
          }}>
            Certificate Verification
          </h1>
          <div style={{
            height: 2,
            width: 56,
            background: '#d95637',
            margin: '14px auto 0',
            borderRadius: 1,
            display: 'none',
          }} />
        </div>

        {/* ── Loading ── */}
        {status === 'loading' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            color: '#666',
            marginTop: 32,
          }}>
            <Loader size={36} color="#d95637" className="spin" />
            <p style={{ fontSize: 14 }}>Verifying certificate…</p>
          </div>
        )}

        {/* ── Not found ── */}
        {(status === 'not_found' || status === 'error') && (
          <div style={{
            background: '#fff',
            border: '2px solid #e53e3e',
            borderRadius: 12,
            padding: '36px 40px',
            textAlign: 'center',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <XCircle size={48} color="#e53e3e" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e53e3e', marginBottom: 12 }}>
              Certificate Not Verified
            </h2>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75 }}>
              This certificate could not be found in our records. The document may be
              forged, altered, or the QR code may be invalid.
            </p>
          </div>
        )}

        {/* ── Verified ── */}
        {status === 'found' && record && record.niche_training && (
          <div style={{
            background: '#fff',
            border: '2px solid #38a169',
            borderRadius: 12,
            padding: '32px 40px',
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>

            {/* Verified badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
            }}>
              <CheckCircle size={38} color="#38a169" style={{ flexShrink: 0 }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#38a169', lineHeight: 1.3 }}>
                VERIFIED
              </h2>
            </div>

            {/* Details */}
            {rows.map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '9px 0',
                  borderBottom: '1px solid #f7f7f7',
                }}
              >
                <span style={{
                  fontSize: 12,
                  color: '#888',
                  fontWeight: 500,
                  minWidth: 150,
                  paddingRight: 12,
                }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 13,
                  color: label === 'Grade / Tier' ? '#d95637' : '#111',
                  fontWeight: label === 'Grade / Tier' || label === 'Full Name' ? 700 : 400,
                  textAlign: 'right',
                }}>
                  {value}
                </span>
              </div>
            ))}

            {/* Footer — removed */}
          </div>
        )}

        {/* ── Footer note + CTA ── */}
        <div style={{ marginTop: 32, textAlign: 'center', maxWidth: 400 }}>
          <p style={{
            fontSize: 11,
            color: '#999',
            lineHeight: 1.7,
            marginBottom: 16,
            fontFamily: "'Poppins', sans-serif",
          }}>
            This certificate is the property of Nestara. If you found it lost, or if you have
            a concern, need trained personnel, or are interested in our training programmes.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/254714681776${waMessage ? `?text=${waMessage}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '9px 20px',
                background: 'transparent',
                color: '#555',
                border: '1px solid #ccc',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: 'none',
                fontFamily: "'Poppins', sans-serif",
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              Questions? Contact Us
            </a>
          </div>
        </div>

        </div> {/* end content wrapper */}
      </div>
    </>
  )
}

export default VerifyCertificate
