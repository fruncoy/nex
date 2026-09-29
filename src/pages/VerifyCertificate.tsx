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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 16px 80px',
        fontFamily: "'Poppins', sans-serif",
      }}>

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

        {/* ── WhatsApp CTA — subtle text link ── */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a
            href={`https://wa.me/254714681776${waMessage ? `?text=${waMessage}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 20px',
              background: '#fff',
              color: '#555',
              border: '1px solid #e0e0e0',
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
            {/* WhatsApp icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
      </div>
    </>
  )
}

export default VerifyCertificate
