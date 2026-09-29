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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

  const rows = record?.niche_training
    ? [
        { label: 'Full Name',          value: record.niche_training.name },
        { label: 'Phone Number',        value: record.niche_training.phone || 'N/A' },
        { label: 'Course',             value: record.niche_training.course || 'N/A' },
        { label: 'Role',               value: record.niche_training.role || 'N/A' },
        { label: 'Training Category',  value: record.niche_training.training_category || 'N/A' },
        { label: 'Grade / Tier',       value: record.tier || 'Completed' },
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
        padding: '48px 16px 64px',
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
              This certificate could not be found in our records. The document may be forged,
              altered, or the QR code may be invalid.
            </p>
            <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
              To confirm authenticity, contact Nestara directly.
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
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#38a169', lineHeight: 1.3 }}>
                  VERIFIED — Authentic Certificate
                </h2>
                <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                  This record was found in the Nestara NICHE database
                </p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#edf2f7', marginBottom: 20 }} />

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

            {/* Footer */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <p style={{
                fontSize: 10,
                color: '#bbb',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                Verified by Nestara · member.nestara.co.ke
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default VerifyCertificate
