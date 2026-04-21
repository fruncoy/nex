import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { smsService } from '../services/smsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { RefreshCw, Search, Send, Users, Loader2, GraduationCap, MessageSquare, Radio, BarChart2, CheckCircle, XCircle, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SMSLog {
  id: string
  recipient_type: string
  recipient_name: string
  phone_number: string
  message_type: string
  message_content: string
  status: string
  response_code: number
  retry_count: number
  sent_at: string
  created_at: string
  campaign_id?: string
  staff?: { name: string }
}

interface Campaign {
  id: string
  name: string
  campaign_type: string
  message: string
  recipients_count: number
  sent_count: number
  failed_count: number
  status: string
  created_by: string
  sent_at: string
  created_at: string
}

interface Cohort {
  id: string
  cohort_number: number
  start_date: string
  end_date: string
  status: string
  trainee_count?: number
}

interface Trainee {
  id: string
  name: string
  phone: string
  course: string
  cohort_id?: string
  cohortNumber?: number
  formattedPhone?: string
}

interface StaffMember {
  id: string
  name: string
  phone?: string
  role?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPhone = (phone: string) =>
  phone?.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`

const MSG_TYPE_LABEL: Record<string, string> = {
  interview_reminder: 'Interview Reminder',
  welcome: 'Welcome',
  notification: 'Notification',
  bulk: 'Bulk',
  graduation: 'Graduation',
  weekly_digest: 'Weekly Digest',
  broadcast: 'Broadcast',
}

const ERROR_CODES: Record<number, string> = {
  200: 'Success',
  1001: 'Invalid sender ID',
  1002: 'Network not allowed',
  1003: 'Invalid mobile number',
  1004: 'Low bulk credits',
  1005: 'System error',
  1006: 'Invalid credentials',
  1007: 'System error',
  1008: 'No delivery report',
  1009: 'Unsupported data type',
  1010: 'Unsupported request type',
  4090: 'Internal error',
  4091: 'No Partner ID',
  4092: 'No API key',
  4093: 'Details not found',
}

// ─── Shared send helper ───────────────────────────────────────────────────────

async function sendCampaign(opts: {
  name: string
  type: 'graduation' | 'weekly_digest' | 'broadcast'
  message: string
  recipients: { id?: string; name: string; phone: string; type: 'candidate' | 'staff' | 'client' }[]
  cohortId?: string
  staffId: string
  staffName: string
  showToast: (msg: string, type: 'success' | 'error') => void
  onDone: () => void
}) {
  const { name, type, message, recipients, cohortId, staffId, staffName, showToast, onDone } = opts

  // Create campaign
  const { data: campaign, error: campErr } = await supabase
    .from('sms_campaigns')
    .insert({
      name,
      campaign_type: type,
      message,
      cohort_id: cohortId || null,
      recipients_count: recipients.length,
      status: 'sending',
      created_by: staffName,
    })
    .select()
    .single()

  if (campErr || !campaign) {
    showToast('Failed to create campaign', 'error')
    return
  }

  let success = 0, failed = 0

  for (const r of recipients) {
    const phone = formatPhone(r.phone)
    const result = await smsService.sendSMS({
      recipientType: r.type,
      recipientId: r.id,
      recipientName: r.name,
      phoneNumber: phone,
      messageType: type,
      messageContent: message,
      sentBy: staffId,
    })

    // Log to sms_records
    await supabase.from('sms_records').insert({
      campaign_id: campaign.id,
      recipient_name: r.name,
      recipient_phone: phone,
      message,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
    })

    if (result.success) success++
    else failed++
  }

  // Update campaign
  await supabase.from('sms_campaigns').update({
    status: 'completed',
    sent_count: success,
    failed_count: failed,
    sent_at: new Date().toISOString(),
  }).eq('id', campaign.id)

  showToast(`Sent ${success} / ${recipients.length} messages${failed > 0 ? ` (${failed} failed)` : ''}`, success > 0 ? 'success' : 'error')
  onDone()
}

// ─── Tab: Summary ─────────────────────────────────────────────────────────────

function SummaryTab({ logs, onRefresh, loading }: { logs: SMSLog[]; onRefresh: () => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())
  const [showErrorRef, setShowErrorRef] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { showToast } = useToast()

  const filtered = logs.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (typeFilter !== 'all' && l.message_type !== typeFilter) return false
    if (search && !l.recipient_name.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone_number.includes(search) && !l.message_content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    today: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    thisWeek: logs.filter(l => new Date(l.created_at) >= new Date(Date.now() - 7 * 86400000)).length,
    successRate: logs.length > 0 ? Math.round((logs.filter(l => l.status === 'sent').length / logs.length) * 100) : 0,
  }

  const handleRetry = async (logId: string) => {
    setRetryingIds(prev => new Set([...prev, logId]))
    try {
      const result = await smsService.retryFailedSMS(logId)
      if (result.success) { showToast('Retry successful', 'success'); onRefresh() }
      else showToast(`Retry failed: ${result.error}`, 'error')
    } finally {
      setRetryingIds(prev => { const s = new Set(prev); s.delete(logId); return s })
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-500' },
          { label: 'Sent', value: stats.sent, color: 'bg-emerald-500' },
          { label: 'Failed', value: stats.failed, color: 'bg-red-500' },
          { label: 'Today', value: stats.today, color: 'bg-purple-500' },
          { label: 'This Week', value: stats.thisWeek, color: 'bg-orange-500' },
          { label: 'Success Rate', value: `${stats.successRate}%`, color: 'bg-indigo-500' },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-lg p-4`}>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Error codes toggle */}
      <div>
        <button onClick={() => setShowErrorRef(!showErrorRef)} className="text-xs text-gray-500 underline">
          {showErrorRef ? 'Hide' : 'Show'} error code reference
        </button>
        {showErrorRef && (
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
            {Object.entries(ERROR_CODES).map(([code, desc]) => (
              <div key={code}><span className="font-mono text-gray-700">{code}</span> — {desc}</div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, message..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary">
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary">
          <option value="all">All Types</option>
          {Object.entries(MSG_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={onRefresh} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Logs table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Sent By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.recipient_name}</div>
                      <div className="text-xs text-gray-500">{log.phone_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        {MSG_TYPE_LABEL[log.message_type] || log.message_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="text-gray-700 truncate text-xs">{log.message_content}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {log.status}
                      </span>
                      {log.response_code && log.response_code !== 200 && (
                        <div className="text-xs text-gray-400 mt-0.5">{log.response_code}</div>
                      )}
                      {log.retry_count > 0 && <div className="text-xs text-gray-400">{log.retry_count}x retry</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{log.staff?.name || 'System'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <div>{new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'failed' && ![1004, 1006].includes(log.response_code) && (
                        <button onClick={e => { e.stopPropagation(); handleRetry(log.id) }} disabled={retryingIds.has(log.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">
                          {retryingIds.has(log.id) ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Full Message</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3">{log.message_content}</div>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
                          <div><span className="font-medium text-gray-700">Recipient:</span> {log.recipient_name}</div>
                          <div><span className="font-medium text-gray-700">Phone:</span> {log.phone_number}</div>
                          <div><span className="font-medium text-gray-700">Type:</span> {MSG_TYPE_LABEL[log.message_type] || log.message_type}</div>
                          <div><span className="font-medium text-gray-700">Response:</span> {log.response_code} — {ERROR_CODES[log.response_code] || 'Unknown'}</div>
                          <div><span className="font-medium text-gray-700">Sent by:</span> {log.staff?.name || 'System'}</div>
                          <div><span className="font-medium text-gray-700">Date:</span> {new Date(log.created_at).toLocaleString('en-GB')}</div>
                          {log.retry_count > 0 && <div><span className="font-medium text-gray-700">Retries:</span> {log.retry_count}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Graduation ──────────────────────────────────────────────────────────

function GraduationTab({ onRefresh }: { onRefresh: () => void }) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([])
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    loadCohorts()
    loadCampaigns()
  }, [])

  const loadCohorts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('niche_cohorts')
      .select('*')
      .in('status', ['completed', 'graduated'])
      .order('cohort_number', { ascending: false })

    const withCounts = await Promise.all((data || []).map(async c => {
      const { count } = await supabase.from('niche_training')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', c.id).not('phone', 'is', null).neq('phone', '')
      return { ...c, trainee_count: count || 0 }
    }))
    setCohorts(withCounts.filter(c => c.trainee_count > 0))
    setLoading(false)
  }

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns')
      .select('*').eq('type', 'graduation')
      .order('created_at', { ascending: false }).limit(10)
    setCampaigns(data || [])
  }

  const toggleCohort = async (cohortId: string) => {
    const next = selectedCohorts.includes(cohortId)
      ? selectedCohorts.filter(id => id !== cohortId)
      : [...selectedCohorts, cohortId]
    setSelectedCohorts(next)

    if (next.length === 0) { setTrainees([]); setMessage(''); return }

    const { data } = await supabase.from('niche_training')
      .select('id, name, phone, course, cohort_id')
      .in('cohort_id', next).not('phone', 'is', null).neq('phone', '')
    
    const formatted = (data || []).map(t => ({
      ...t,
      formattedPhone: formatPhone(t.phone),
      cohortNumber: cohorts.find(c => c.id === t.cohort_id)?.cohort_number,
    }))
    setTrainees(formatted)

    const nums = next.map(id => cohorts.find(c => c.id === id)?.cohort_number).filter(Boolean).sort((a,b) => a-b)
    const cohortText = nums.length === 1 ? `Cohort ${nums[0]}` : `Cohorts ${nums.join(', ')}`
    setMessage(`Congratulations! You have successfully completed your NICHE training program (${cohortText}). We are proud of your achievement and wish you success in your career. - Nestara Team`)
  }

  const handleSend = async () => {
    if (!trainees.length || !message.trim()) return
    setSending(true)
    const nums = selectedCohorts.map(id => cohorts.find(c => c.id === id)?.cohort_number).filter(Boolean).sort((a,b) => a-b)
    await sendCampaign({
      name: `Graduation - Cohort${nums.length > 1 ? 's' : ''} ${nums.join(', ')}`,
      type: 'graduation',
      message,
      recipients: trainees.map(t => ({ id: t.id, name: t.name, phone: t.formattedPhone!, type: 'candidate' })),
      cohortId: selectedCohorts[0],
      staffId: staff?.id || '',
      staffName: staff?.name || 'System',
      showToast,
      onDone: () => { setSelectedCohorts([]); setTrainees([]); setMessage(''); loadCampaigns(); onRefresh() },
    })
    setSending(false)
  }

  const sentCohortIds = new Set(campaigns.map(c => c.cohort_id).filter(Boolean))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-3">Select Completed Cohorts</div>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading cohorts...</div>
            ) : cohorts.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No completed cohorts with trainees</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {cohorts.map(c => (
                  <button key={c.id} onClick={() => toggleCohort(c.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${selectedCohorts.includes(c.id) ? 'border-nestalk-primary bg-nestalk-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-gray-900">Cohort {c.cohort_number}</div>
                      {sentCohortIds.has(c.id) && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Sent</span>}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-emerald-600 font-medium">{c.trainee_count} trainees</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {trainees.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Message <span className="text-gray-400 font-normal">({message.length} chars)</span></div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
              <button onClick={handleSend} disabled={sending || !message.trim()}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send to {trainees.length} Trainees</>}
              </button>
            </div>
          )}
        </div>

        {/* Right: recipients preview */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Recipients {trainees.length > 0 && <span className="text-gray-400 font-normal">({trainees.length})</span>}
          </div>
          {trainees.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-lg">Select cohorts to preview recipients</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              {trainees.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-400">Cohort {t.cohortNumber}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-500">{t.formattedPhone}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">Past Graduation Campaigns</div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Campaign</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Recipients</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="text-center px-4 py-3 text-gray-700">{c.recipients_count}</td>
                    <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}</td>
                    <td className="text-center px-4 py-3 text-red-600">{c.failed_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Weekly Digest ───────────────────────────────────────────────────────

function WeeklyTab({ onRefresh }: { onRefresh: () => void }) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [stats, setStats] = useState({ activeTrainees: 0, availableStaff: 0, interviewsThisWeek: 0, graduatedTotal: 0, cohortNumber: 0, daysRemaining: 0, topPerformerName: '', topPerformerScore: 0, mostImprovedName: '' })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    loadStaff()
    loadStats()
    loadCampaigns()
  }, [])

  const loadStaff = async () => {
    const { data } = await supabase.from('staff').select('id, name, role, username, phone').not('phone', 'is', null).neq('phone', '')
    setStaffList(data || [])
    setSelectedStaff((data || []).map((s: any) => s.id))
  }

  const loadStats = async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [{ count: activeTrainees }, { count: availableStaff }, { count: interviewsThisWeek }, { count: graduatedTotal }] = await Promise.all([
      supabase.from('niche_training').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'WON'),
      supabase.from('niche_interviews').select('*', { count: 'exact', head: true }).gte('date_time', weekAgo),
      supabase.from('niche_training').select('*', { count: 'exact', head: true }).eq('status', 'Graduated'),
    ])

    // Active cohort
    const { data: activeCohort } = await supabase.from('niche_cohorts').select('*').eq('status', 'active').single()
    const cohortNumber = activeCohort?.cohort_number || 0
    const daysRemaining = activeCohort ? Math.max(0, Math.ceil((new Date(activeCohort.end_date).getTime() - Date.now()) / 86400000)) : 0

    // Top performer and most improved from active cohort
    let topPerformerName = ''
    let topPerformerScore = 0
    let mostImprovedName = ''

    if (activeCohort?.id) {
      const { data: trainees } = await supabase.from('niche_training').select('id, name').eq('cohort_id', activeCohort.id)
      const traineeIds = trainees?.map(t => t.id) || []
      const nameMap: Record<string, string> = {}
      trainees?.forEach(t => { nameMap[t.id] = t.name })

      if (traineeIds.length > 0) {
        const { data: assessments } = await supabase
          .from('niche_progress_assessments')
          .select('trainee_id, assessment_day, question_1_score, question_2_score, question_3_score, question_4_score')
          .in('trainee_id', traineeIds)

        // Build per-trainee day averages
        const scoreMap: Record<string, Record<number, number>> = {}
        assessments?.forEach(a => {
          const sc = [a.question_1_score, a.question_2_score, a.question_3_score, a.question_4_score].filter(s => s != null && s > 0) as number[]
          if (sc.length > 0) {
            if (!scoreMap[a.trainee_id]) scoreMap[a.trainee_id] = {}
            scoreMap[a.trainee_id][a.assessment_day] = sc.reduce((s, v) => s + v, 0) / sc.length
          }
        })

        const traineeList = traineeIds
          .filter(id => scoreMap[id])
          .map(id => {
            const days = Object.keys(scoreMap[id]).map(Number).sort()
            const avg = days.reduce((s, d) => s + scoreMap[id][d], 0) / days.length
            const gain = days.length >= 2 ? scoreMap[id][days[days.length - 1]] - scoreMap[id][days[0]] : 0
            return { id, name: nameMap[id] || '', avg, gain }
          })

        const top = [...traineeList].sort((a, b) => b.avg - a.avg)[0]
        const improved = [...traineeList].filter(t => t.gain > 0).sort((a, b) => b.gain - a.gain)[0]

        topPerformerName = top?.name || ''
        topPerformerScore = top ? Math.round(top.avg * 10) / 10 : 0
        mostImprovedName = improved?.name || ''
      }
    }

    const s = { activeTrainees: activeTrainees || 0, availableStaff: availableStaff || 0, interviewsThisWeek: interviewsThisWeek || 0, graduatedTotal: graduatedTotal || 0, cohortNumber, daysRemaining, topPerformerName, topPerformerScore, mostImprovedName }
    setStats(s)
    buildMessage(s)
  }

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns').select('*').eq('type', 'weekly_digest').order('created_at', { ascending: false }).limit(5)
    setCampaigns(data || [])
  }

  const buildMessage = (s: typeof stats) => {
    const today = new Date()
    const day = today.getDate()
    const month = today.toLocaleDateString('en-US', { month: 'long' })
    const year = today.getFullYear()
    const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
    const cohortRoman = ROMAN[s.cohortNumber] || s.cohortNumber

    let body = `Nestara Digest Day ${day} ${month} ${year}\n\n`

    if (s.cohortNumber > 0) {
      body += `Cohort ${cohortRoman} is now in its final stage with ${s.daysRemaining} day${s.daysRemaining !== 1 ? 's' : ''} left.`
      if (s.topPerformerName) {
        const firstName = s.topPerformerName.split(' ')[0]
        body += ` ${firstName} is leading the cohort with a score of ${s.topPerformerScore}.`
      }
      if (s.mostImprovedName) {
        const firstName = s.mostImprovedName.split(' ')[0]
        body += ` ${firstName} is the most improved.`
      }
      body += `\n\nMore: nestara.vercel.app/digest`
    } else {
      body += `Active trainees: ${s.activeTrainees}. Interviews this week: ${s.interviewsThisWeek}.\n\nMore: nestara.vercel.app/digest`
    }

    setMessage(body)
  }

  const toggleStaff = (id: string) =>
    setSelectedStaff(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const handleSend = async () => {
    const recipients = staffList.filter(s => selectedStaff.includes(s.id))
    if (!recipients.length || !message.trim()) return
    setSending(true)
    await sendCampaign({
      name: `Weekly Digest - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      type: 'weekly_digest',
      message,
      recipients: recipients.map(s => ({ id: s.id, name: s.name, phone: s.phone!, type: 'staff' })),
      staffId: staff?.id || '',
      staffName: staff?.name || 'System',
      showToast,
      onDone: () => { loadCampaigns(); onRefresh() },
    })
    setSending(false)
  }

  return (
    <div className="space-y-6">
      {/* Live stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Trainees', value: stats.activeTrainees, color: 'text-blue-700' },
          { label: 'Available Staff', value: stats.availableStaff, color: 'text-emerald-700' },
          { label: 'Interviews This Week', value: stats.interviewsThisWeek, color: 'text-purple-700' },
          { label: 'Total Graduates', value: stats.graduatedTotal, color: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Message <span className="text-gray-400 font-normal">({message.length} chars)</span></div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={10}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
          <button onClick={() => buildMessage(stats)} className="mt-1 text-xs text-nestalk-primary underline">Reset to default</button>
          <button onClick={handleSend} disabled={sending || !selectedStaff.length || !message.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50 transition-colors text-sm font-medium">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send to {selectedStaff.length} Staff Members</>}
          </button>
        </div>

        {/* Staff selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700">Staff Recipients</div>
            <button onClick={() => setSelectedStaff(selectedStaff.length === staffList.length ? [] : staffList.map(s => s.id))}
              className="text-xs text-nestalk-primary underline">
              {selectedStaff.length === staffList.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {staffList.map(s => (
              <div key={s.id} onClick={() => toggleStaff(s.id)}
                className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${selectedStaff.includes(s.id) ? 'bg-nestalk-primary/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedStaff.includes(s.id) ? 'border-nestalk-primary bg-nestalk-primary' : 'border-gray-300'}`}>
                    {selectedStaff.includes(s.id) && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.role}</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-gray-500">
                  {s.phone ? s.phone : <span className="text-orange-400">No phone</span>}
                </div>
              </div>
            ))}
            {staffList.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No staff found</div>}
          </div>
        </div>
      </div>

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">Past Weekly Digests</div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}</td>
                    <td className="text-center px-4 py-3 text-red-600">{c.failed_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Directions ─────────────────────────────────────────────────────────

function DirectionsTab({ onRefresh }: { onRefresh: () => void }) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  const DIRECTIONS_MSG = `Nestara Institute of Care and Hospitality Excellence

Directions:
Take a matatu on Ngong Road.
Stop at Corner Stage.
Ask anyone for Ngong Children's Home or Kanjo Gate.
Enter through the Kanjo Gate.
Ask the guard there for Nestara School.
Call: 0714681893 if you need help.

Karibu Sana!`

  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.startsWith('254')) return `+${digits}`
    if (digits.startsWith('0')) return `+254${digits.slice(1)}`
    return `+254${digits}`
  }

  const isValid = phone.replace(/\D/g, '').length >= 9

  const handleSend = async () => {
    if (!isValid) return
    setSending(true)
    try {
      const formatted = formatPhoneInput(phone)
      const result = await smsService.sendSMS({
        recipientType: 'candidate',
        recipientName: formatted,
        phoneNumber: formatted,
        messageType: 'notification',
        messageContent: DIRECTIONS_MSG,
        sentBy: staff?.id || '',
      })
      if (result.success) {
        showToast('Directions sent!', 'success')
        setPhone('')
        onRefresh()
      } else {
        showToast(`Failed: ${result.error}`, 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message Preview</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{DIRECTIONS_MSG}</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-nestalk-primary">
          <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-r border-gray-300">+254</span>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="712 345 678"
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
            maxLength={9}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{phone.length}/9 digits</p>
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !isValid}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Directions</>}
      </button>
    </div>
  )
}

function BroadcastTab({ onRefresh }: { onRefresh: () => void }) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [audience, setAudience] = useState<'all_trainees' | 'all_staff' | 'cohort' | 'custom'>('all_trainees')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [selectedCohort, setSelectedCohort] = useState('')
  const [recipients, setRecipients] = useState<{ id?: string; name: string; phone: string; type: 'candidate' | 'staff' | 'client' }[]>([])
  const [customNumbers, setCustomNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    loadCohorts()
    loadCampaigns()
  }, [])

  useEffect(() => {
    if (audience !== 'custom') loadRecipients()
  }, [audience, selectedCohort])

  const loadCohorts = async () => {
    const { data } = await supabase.from('niche_cohorts').select('*')
      .in('status', ['active', 'completed', 'graduated'])
      .order('cohort_number', { ascending: false })
    setCohorts(data || [])
  }

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns').select('*').eq('type', 'broadcast').order('created_at', { ascending: false }).limit(10)
    setCampaigns(data || [])
  }

  const loadRecipients = async () => {
    setLoadingRecipients(true)
    try {
      if (audience === 'all_trainees') {
        const { data } = await supabase.from('niche_training').select('id, name, phone').not('phone', 'is', null).neq('phone', '')
        setRecipients((data || []).map(t => ({ id: t.id, name: t.name, phone: formatPhone(t.phone), type: 'candidate' as const })))
      } else if (audience === 'all_staff') {
        const { data } = await supabase.from('staff').select('id, name, phone').not('phone', 'is', null).neq('phone', '')
        setRecipients((data || []).map(s => ({ id: s.id, name: s.name, phone: s.phone, type: 'staff' as const })))
      } else if (audience === 'cohort' && selectedCohort) {
        const { data } = await supabase.from('niche_training').select('id, name, phone').eq('cohort_id', selectedCohort).not('phone', 'is', null).neq('phone', '')
        setRecipients((data || []).map(t => ({ id: t.id, name: t.name, phone: formatPhone(t.phone), type: 'candidate' as const })))
      } else {
        setRecipients([])
      }
    } finally {
      setLoadingRecipients(false)
    }
  }

  const parseCustomNumbers = () => {
    const lines = customNumbers.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
    return lines.map(phone => ({ name: phone, phone: formatPhone(phone), type: 'candidate' as const }))
  }

  const finalRecipients = audience === 'custom' ? parseCustomNumbers() : recipients

  const handleSend = async () => {
    if (!finalRecipients.length || !message.trim()) return
    setSending(true)
    const audienceLabel = audience === 'all_trainees' ? 'All Trainees' : audience === 'all_staff' ? 'All Staff' : audience === 'cohort' ? `Cohort ${cohorts.find(c => c.id === selectedCohort)?.cohort_number}` : 'Custom'
    await sendCampaign({
      name: `Broadcast - ${audienceLabel} - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      type: 'broadcast',
      message,
      recipients: finalRecipients,
      staffId: staff?.id || '',
      staffName: staff?.name || 'System',
      showToast,
      onDone: () => { setMessage(''); loadCampaigns(); onRefresh() },
    })
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-4">
          {/* Audience */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Audience</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all_trainees', label: 'All Trainees' },
                { value: 'all_staff', label: 'All Staff' },
                { value: 'cohort', label: 'Specific Cohort' },
                { value: 'custom', label: 'Custom Numbers' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setAudience(opt.value as any)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${audience === opt.value ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cohort picker */}
          {audience === 'cohort' && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Select Cohort</div>
              <select value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary">
                <option value="">-- Select cohort --</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>Cohort {c.cohort_number} ({c.status})</option>)}
              </select>
            </div>
          )}

          {/* Custom numbers */}
          {audience === 'custom' && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Phone Numbers <span className="text-gray-400 font-normal text-xs">(one per line or comma separated)</span></div>
              <textarea value={customNumbers} onChange={e => setCustomNumbers(e.target.value)} rows={5}
                placeholder="0712345678&#10;0723456789&#10;+254734567890"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary font-mono" />
              <div className="text-xs text-gray-400 mt-1">{parseCustomNumbers().length} numbers parsed</div>
            </div>
          )}

          {/* Message */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Message <span className="text-gray-400 font-normal">({message.length} chars)</span></div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              placeholder="Type your broadcast message..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
          </div>

          <button onClick={handleSend} disabled={sending || !finalRecipients.length || !message.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50 transition-colors text-sm font-medium">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send to {finalRecipients.length} Recipients</>}
          </button>
        </div>

        {/* Right: recipients preview */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Recipients Preview
            {loadingRecipients && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-gray-400" />}
            {finalRecipients.length > 0 && <span className="text-gray-400 font-normal ml-1">({finalRecipients.length})</span>}
          </div>
          {finalRecipients.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-lg">
              {audience === 'cohort' && !selectedCohort ? 'Select a cohort above' : 'No recipients yet'}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              {finalRecipients.slice(0, 100).map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-6">{i + 1}.</span>
                    <div className="text-sm font-medium text-gray-900">{r.name}</div>
                  </div>
                  <div className="text-xs font-mono text-gray-500">{r.phone}</div>
                </div>
              ))}
              {finalRecipients.length > 100 && (
                <div className="text-center py-2 text-xs text-gray-400">+{finalRecipients.length - 100} more</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">Past Broadcasts</div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Campaign</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Message</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Recipients</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={c.message}>{c.message}</td>
                    <td className="text-center px-4 py-3 text-gray-700">{c.recipients_count}</td>
                    <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}</td>
                    <td className="text-center px-4 py-3 text-red-600">{c.failed_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.created_by}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'summary' | 'directions' | 'graduation' | 'weekly' | 'broadcast'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'summary', label: 'Summary', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'directions', label: 'Directions', icon: <Send className="w-4 h-4" /> },
  { id: 'graduation', label: 'Graduation', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'weekly', label: 'Daily Digest', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'broadcast', label: 'Broadcast', icon: <Radio className="w-4 h-4" /> },
]

export function SMSManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [logs, setLogs] = useState<SMSLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sms_logs')
      .select('*, staff:sent_by(name)')
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SMS Management</h1>
        <p className="text-sm text-gray-500">Send and track all SMS communications</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-nestalk-primary text-nestalk-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'summary' && <SummaryTab logs={logs} onRefresh={loadLogs} loading={loading} />}
      {activeTab === 'directions' && <DirectionsTab onRefresh={loadLogs} />}
      {activeTab === 'graduation' && <GraduationTab onRefresh={loadLogs} />}
      {activeTab === 'weekly' && <WeeklyTab onRefresh={loadLogs} />}
      {activeTab === 'broadcast' && <BroadcastTab onRefresh={loadLogs} />}
    </div>
  )
}
