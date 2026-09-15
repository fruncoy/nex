import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { smsService } from '../services/smsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { RefreshCw, Search, Send, Users, Loader2, GraduationCap, MessageSquare, Radio, BarChart2, CheckCircle, XCircle, Clock, BookUser, Plus, Trash2 } from 'lucide-react'

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

const formatPhone = (phone: string) => {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, '')
  // Fix +2540XXXXXXXXX (extra 0 after 254) → 13 digits starting with 2540
  if (digits.startsWith('2540') && digits.length === 13) return `+254${digits.slice(4)}`
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.length === 9) return `+254${digits}`
  return `+${digits}`
}

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
  recipients: { id?: string; name: string; phone: string; type: 'candidate' | 'staff' | 'client'; personalizedMessage?: string }[]
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
    const msgToSend = r.personalizedMessage ?? message
    const result = await smsService.sendSMS({
      recipientType: r.type,
      recipientId: r.id,
      recipientName: r.name,
      phoneNumber: phone,
      messageType: type,
      messageContent: msgToSend,
      sentBy: staffId,
    })

    // Log to sms_records
    await supabase.from('sms_records').insert({
      campaign_id: campaign.id,
      recipient_name: r.name,
      recipient_phone: phone,
      message: msgToSend,
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
                      <td colSpan={6} className="px-6 py-4">
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
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No logs found</td></tr>
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
  const [smsType, setSmsType] = useState<'graduated' | 'completed'>('graduated')

  useEffect(() => {
    loadCohorts()
    loadCampaigns()
  }, [])

  useEffect(() => {
    // Reset selections when type changes
    setSelectedCohorts([])
    setTrainees([])
    setMessage('')
  }, [smsType])

  const loadCohorts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('niche_cohorts')
      .select('*')
      .in('status', ['completed', 'graduated', 'active'])
      .order('cohort_number', { ascending: false })

    const withCounts = await Promise.all((data || []).map(async c => {
      const { count: gradCount } = await supabase.from('niche_training')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', c.id).eq('status', 'Graduated')
        .not('phone', 'is', null).neq('phone', '')
      const { count: compCount } = await supabase.from('niche_training')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', c.id).eq('status', 'Completed')
        .not('phone', 'is', null).neq('phone', '')
      return { ...c, trainee_count: gradCount || 0, completed_count: compCount || 0 }
    }))
    setCohorts(withCounts.filter(c => (c.trainee_count > 0 || (c as any).completed_count > 0)))
    setLoading(false)
  }

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns')
      .select('*').eq('campaign_type', 'graduation')
      .order('created_at', { ascending: false }).limit(10)
    setCampaigns(data || [])
  }

  const toggleCohort = async (cohortId: string) => {
    const next = selectedCohorts.includes(cohortId)
      ? selectedCohorts.filter(id => id !== cohortId)
      : [...selectedCohorts, cohortId]
    setSelectedCohorts(next)

    if (next.length === 0) { setTrainees([]); setMessage(''); return }

    const statusFilter = smsType === 'graduated' ? 'Graduated' : 'Completed'
    const { data } = await supabase.from('niche_training')
      .select('id, name, phone, course, cohort_id')
      .in('cohort_id', next)
      .eq('status', statusFilter)
      .not('phone', 'is', null).neq('phone', '')

    const formatted = (data || []).map(t => ({
      ...t,
      formattedPhone: formatPhone(t.phone),
      cohortNumber: cohorts.find(c => c.id === t.cohort_id)?.cohort_number,
    }))
    setTrainees(formatted)

    const nums = next.map(id => cohorts.find(c => c.id === id)?.cohort_number).filter(Boolean).sort((a,b) => a-b)
    const cohortText = nums.length === 1 ? `Cohort ${nums[0]}` : `Cohorts ${nums.join(', ')}`

    if (smsType === 'graduated') {
      setMessage(`Congratulations! You have successfully completed your NICHE 2-Week Training Program (${cohortText}). We are proud of your achievement and wish you success in your career. - Nestara Team`)
    } else {
      setMessage(`Thank you for completing your NICHE Short Course (${cohortText})! We hope it was valuable. We'd love your feedback — please reply to this message or call us. - Nestara Team`)
    }
  }

  const handleSend = async () => {
    if (!trainees.length || !message.trim()) return
    setSending(true)
    const nums = selectedCohorts.map(id => cohorts.find(c => c.id === id)?.cohort_number).filter(Boolean).sort((a,b) => a-b)
    const label = smsType === 'graduated' ? 'Graduation' : 'Short Course Completion'
    await sendCampaign({
      name: `${label} - Cohort${nums.length > 1 ? 's' : ''} ${nums.join(', ')}`,
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
      {/* Type selector */}
      <div className="flex gap-3">
        <button onClick={() => setSmsType('graduated')}
          className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
            smsType === 'graduated' ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
          🎓 2-Week Flagship Graduation
        </button>
        <button onClick={() => setSmsType('completed')}
          className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
            smsType === 'completed' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
          ✅ Short Course Completion + Feedback
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-3">
              Select Cohorts — <span className="font-normal text-gray-500">{smsType === 'graduated' ? 'showing Graduated trainees' : 'showing Completed trainees'}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading cohorts...</div>
            ) : cohorts.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No cohorts found</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {cohorts.map(c => {
                  const count = smsType === 'graduated' ? c.trainee_count : (c as any).completed_count
                  if (count === 0) return null
                  return (
                    <button key={c.id} onClick={() => toggleCohort(c.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedCohorts.includes(c.id)
                          ? smsType === 'graduated' ? 'border-nestalk-primary bg-nestalk-primary/5' : 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm text-gray-900">Cohort {c.cohort_number}</div>
                        {sentCohortIds.has(c.id) && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Sent</span>}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className={`text-xs font-medium ${smsType === 'graduated' ? 'text-emerald-600' : 'text-purple-600'}`}>{count} trainees</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {trainees.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Message <span className="text-gray-400 font-normal">({message.length} chars)</span></div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
              <button onClick={handleSend} disabled={sending || !message.trim()}
                className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-medium ${
                  smsType === 'graduated' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}>
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
                  
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    
                    <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}/{c.recipients_count}</td>
                    <td className="text-center px-4 py-3 text-red-600">{c.failed_count}/{c.recipients_count}</td>
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
                    <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}/{c.recipients_count}</td>
                    <td className="text-center px-4 py-3 text-red-600">{c.failed_count}/{c.recipients_count}</td>
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

interface StaffWithCohort {
  id: string
  name: string
  phone: string
  employment_status?: string
  cohort_label?: string
  niche_training?: { niche_cohorts?: { id: string; cohort_number: number } }
}

interface SmsRecord {
  id: string
  campaign_id: string
  recipient_name: string
  recipient_phone: string
  message: string
  status: string
  error_message?: string
}

function BroadcastTab({ onRefresh }: { onRefresh: () => void }) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [audience, setAudience] = useState<'staff' | 'custom' | 'clients' | 'bad-debt'>('staff')
  const [allStaff, setAllStaff] = useState<StaffWithCohort[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set())
  const [staffSearch, setStaffSearch] = useState('')
  const [allClients, setAllClients] = useState<{ id: string; full_name: string; phone: string; contact_type: string }[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [clientSearch, setClientSearch] = useState('')
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'placement' | 'non-placement'>('all')
  const [allBadDebt, setAllBadDebt] = useState<{ id: string; full_name: string; phone: string }[]>([])
  const [selectedBadDebtIds, setSelectedBadDebtIds] = useState<Set<string>>(new Set())
  const [badDebtSearch, setBadDebtSearch] = useState('')
  const [customNumbers, setCustomNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [usePersonalization, setUsePersonalization] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [campaignRecords, setCampaignRecords] = useState<Record<string, SmsRecord[]>>({})
  const [loadingRecords, setLoadingRecords] = useState<string | null>(null)

  useEffect(() => {
    loadStaff()
    loadClients()
    loadBadDebt()
    loadCampaigns()
  }, [])

  const loadStaff = async () => {
    setLoadingRecipients(true)
    const { data } = await supabase.from('newstaff_members').select(`
      id, name, phone, employment_status, cohort_label,
      niche_training:niche_training_id(niche_cohorts:cohort_id(id, cohort_number))
    `).not('phone', 'is', null).neq('phone', '')
    const nonBlacklisted = (data || []).filter((m: any) => m.employment_status !== 'Blacklisted')
    setAllStaff(nonBlacklisted as StaffWithCohort[])
    setSelectedStaffIds(new Set(nonBlacklisted.map((m: any) => m.id)))
    setLoadingRecipients(false)
  }

  const loadClients = async () => {
    const { data } = await supabase.from('sms_contacts').select('id, full_name, phone, contact_type').not('phone', 'is', null).neq('phone', '')
    setAllClients(data || [])
    setSelectedClientIds(new Set((data || []).map((c: any) => c.id)))
  }

  const loadBadDebt = async () => {
    const { data } = await supabase.from('bad_debt_contacts').select('id, full_name, phone').not('phone', 'is', null).neq('phone', '')
    setAllBadDebt(data || [])
    setSelectedBadDebtIds(new Set((data || []).map((r: any) => r.id)))
  }

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns').select('*').eq('campaign_type', 'broadcast').order('created_at', { ascending: false }).limit(10)
    if (!data) { setCampaigns([]); return }
    const enriched = await Promise.all(data.map(async c => {
      if (c.sent_count > 0 || c.failed_count > 0) return c
      const { data: records } = await supabase.from('sms_records').select('status').eq('campaign_id', c.id)
      if (!records || records.length === 0) return c
      const sent = records.filter((r: any) => r.status === 'sent').length
      const failed = records.filter((r: any) => r.status === 'failed').length
      await supabase.from('sms_campaigns').update({ sent_count: sent, failed_count: failed, recipients_count: records.length }).eq('id', c.id)
      return { ...c, sent_count: sent, failed_count: failed, recipients_count: records.length }
    }))
    setCampaigns(enriched)
  }

  const toggleCampaignRecords = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) { setExpandedCampaignId(null); return }
    setExpandedCampaignId(campaignId)
    if (campaignRecords[campaignId]) return
    setLoadingRecords(campaignId)
    const { data } = await supabase.from('sms_records').select('*').eq('campaign_id', campaignId).order('recipient_name')
    setCampaignRecords(prev => ({ ...prev, [campaignId]: data || [] }))
    setLoadingRecords(null)
  }

  // Group staff by cohort
  const staffByCohort = (() => {
    const groups: { label: string; cohortNum: number; members: StaffWithCohort[] }[] = []
    const seen = new Map<string, number>()
    allStaff.forEach(m => {
      const cohortNum = m.niche_training?.niche_cohorts?.cohort_number
      const label = cohortNum ? `Cohort ${cohortNum}` : (m.cohort_label || 'No Cohort')
      const key = label
      if (!seen.has(key)) { seen.set(key, groups.length); groups.push({ label, cohortNum: cohortNum || 9999, members: [] }) }
      groups[seen.get(key)!].members.push(m)
    })
    return groups.sort((a, b) => a.cohortNum - b.cohortNum)
  })()

  const filteredStaff = allStaff.filter(m =>
    !staffSearch || m.name.toLowerCase().includes(staffSearch.toLowerCase()) || (m.phone || '').includes(staffSearch)
  )

  const filteredClients = allClients.filter(c => {
    if (clientTypeFilter !== 'all' && c.contact_type !== clientTypeFilter) return false
    return !clientSearch || c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone || '').includes(clientSearch)
  })

  const filteredBadDebt = allBadDebt.filter(r =>
    !badDebtSearch || r.full_name.toLowerCase().includes(badDebtSearch.toLowerCase()) || (r.phone || '').includes(badDebtSearch)
  )

  const parseCustomNumbers = () =>
    customNumbers.split(/[\n,]+/).map(l => l.trim()).filter(Boolean)
      .map(phone => ({ name: phone, phone: formatPhone(phone), type: 'candidate' as const }))

  const finalRecipients = audience === 'custom'
    ? parseCustomNumbers()
    : audience === 'staff'
      ? allStaff.filter(m => selectedStaffIds.has(m.id)).map(m => ({ id: m.id, name: m.name, phone: formatPhone(m.phone), type: 'staff' as const }))
      : audience === 'clients'
        ? allClients.filter(c => selectedClientIds.has(c.id)).map(c => ({ id: c.id, name: c.full_name, phone: formatPhone(c.phone), type: 'client' as const }))
        : allBadDebt.filter(r => selectedBadDebtIds.has(r.id)).map(r => ({ id: r.id, name: r.full_name, phone: formatPhone(r.phone), type: 'client' as const }))

  const handleSend = async () => {
    if (!finalRecipients.length || !message.trim()) return
    setSending(true)
    const audienceLabel = audience === 'staff' ? 'Staff Members' : audience === 'clients' ? 'Clients' : audience === 'bad-debt' ? 'Bad Debt' : 'Custom'
    const recipientsWithMsg = usePersonalization
      ? finalRecipients.map(r => ({ ...r, personalizedMessage: message.replace(/\{firstName\}/g, r.name.split(' ')[0]) }))
      : finalRecipients
    await sendCampaign({
      name: `Broadcast - ${audienceLabel} - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      type: 'broadcast',
      message,
      recipients: recipientsWithMsg,
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
                { value: 'staff', label: 'A. Staff Members' },
                { value: 'custom', label: 'B. Custom Numbers' },
                { value: 'clients', label: 'C. Clients' },
                { value: 'bad-debt', label: 'D. Bad Debt' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setAudience(opt.value as any)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    audience === opt.value ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Staff selector */}
          {audience === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-700">Select Staff <span className="text-gray-400 font-normal">({selectedStaffIds.size} selected)</span></div>
                <button onClick={() => setSelectedStaffIds(
                  selectedStaffIds.size === allStaff.length ? new Set() : new Set(allStaff.map(m => m.id))
                )} className="text-xs text-nestalk-primary underline">
                  {selectedStaffIds.size === allStaff.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {loadingRecipients ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                ) : staffByCohort.map(group => {
                  const groupMembers = group.members.filter(m =>
                    !staffSearch || m.name.toLowerCase().includes(staffSearch.toLowerCase()) || (m.phone || '').includes(staffSearch)
                  )
                  if (groupMembers.length === 0) return null
                  const allSelected = groupMembers.every(m => selectedStaffIds.has(m.id))
                  return (
                    <div key={group.label}>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-600">{group.label}</span>
                        <button onClick={() => {
                          const next = new Set(selectedStaffIds)
                          groupMembers.forEach(m => allSelected ? next.delete(m.id) : next.add(m.id))
                          setSelectedStaffIds(next)
                        }} className="text-xs text-nestalk-primary underline">
                          {allSelected ? 'Deselect' : 'Select all'}
                        </button>
                      </div>
                      {groupMembers.map(m => (
                        <div key={m.id} onClick={() => {
                          const next = new Set(selectedStaffIds)
                          next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                          setSelectedStaffIds(next)
                        }} className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                          selectedStaffIds.has(m.id) ? 'bg-nestalk-primary/5' : ''
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                              selectedStaffIds.has(m.id) ? 'border-nestalk-primary bg-nestalk-primary' : 'border-gray-300'
                            }`} />
                            <span className="text-sm text-gray-900">{m.name}</span>
                          </div>
                          <span className="text-xs font-mono text-gray-400">{m.phone}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
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

          {/* Clients selector */}
          {audience === 'clients' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-700">Select Clients <span className="text-gray-400 font-normal">({selectedClientIds.size} selected)</span></div>
                <button onClick={() => {
                  const visible = filteredClients.map(c => c.id)
                  const allSelected = visible.every(id => selectedClientIds.has(id))
                  const next = new Set(selectedClientIds)
                  visible.forEach(id => allSelected ? next.delete(id) : next.add(id))
                  setSelectedClientIds(next)
                }} className="text-xs text-nestalk-primary underline">
                  {filteredClients.every(c => selectedClientIds.has(c.id)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {/* Type filter */}
              <div className="flex gap-1 mb-2 border border-gray-200 rounded-lg p-0.5 bg-gray-50 w-fit">
                {(['all', 'placement', 'non-placement'] as const).map(t => {
                  const count = t === 'all' ? allClients.length : allClients.filter(c => c.contact_type === t).length
                  return (
                    <button key={t} onClick={() => setClientTypeFilter(t)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${clientTypeFilter === t ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t === 'all' ? 'All' : t === 'placement' ? 'Placement' : 'Non-Placement'} <span className="text-gray-400">({count})</span>
                    </button>
                  )
                })}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {filteredClients.map(c => (
                  <div key={c.id} onClick={() => {
                    const next = new Set(selectedClientIds)
                    next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                    setSelectedClientIds(next)
                  }} className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                    selectedClientIds.has(c.id) ? 'bg-nestalk-primary/5' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                        selectedClientIds.has(c.id) ? 'border-nestalk-primary bg-nestalk-primary' : 'border-gray-300'
                      }`} />
                      <span className="text-sm text-gray-900">{c.full_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.contact_type === 'placement' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {c.contact_type === 'placement' ? 'P' : 'NP'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{c.phone}</span>
                  </div>
                ))}
                {filteredClients.length === 0 && <div className="text-sm text-gray-400 text-center py-6">No clients found</div>}
              </div>
            </div>
          )}

          {/* Bad Debt selector */}
          {audience === 'bad-debt' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-700">Select Bad Debt Contacts <span className="text-gray-400 font-normal">({selectedBadDebtIds.size} selected)</span></div>
                <button onClick={() => setSelectedBadDebtIds(
                  selectedBadDebtIds.size === allBadDebt.length ? new Set() : new Set(allBadDebt.map(r => r.id))
                )} className="text-xs text-nestalk-primary underline">
                  {selectedBadDebtIds.size === allBadDebt.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={badDebtSearch} onChange={e => setBadDebtSearch(e.target.value)}
                  placeholder="Search bad debt contacts..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {filteredBadDebt.map(r => (
                  <div key={r.id} onClick={() => {
                    const next = new Set(selectedBadDebtIds)
                    next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                    setSelectedBadDebtIds(next)
                  }} className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                    selectedBadDebtIds.has(r.id) ? 'bg-red-50' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                        selectedBadDebtIds.has(r.id) ? 'border-red-500 bg-red-500' : 'border-gray-300'
                      }`} />
                      <span className="text-sm text-gray-900">{r.full_name}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{r.phone}</span>
                  </div>
                ))}
                {filteredBadDebt.length === 0 && <div className="text-sm text-gray-400 text-center py-6">No bad debt contacts found</div>}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">Message <span className="text-gray-400 font-normal">({message.length} chars)</span></div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <div onClick={() => setUsePersonalization(p => !p)}
                  className={`w-8 h-4 rounded-full transition-colors ${usePersonalization ? 'bg-nestalk-primary' : 'bg-gray-300'} relative`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${usePersonalization ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-500">Personalise</span>
              </label>
            </div>
            {usePersonalization && (
              <div className="mb-1.5">
                <button type="button" onClick={() => setMessage(m => m + '{firstName}')}
                  className="text-xs px-2 py-1 border border-nestalk-primary text-nestalk-primary rounded hover:bg-nestalk-primary/10 transition-colors">
                  + Insert &#123;firstName&#125;
                </button>
                <span className="text-xs text-gray-400 ml-2">replaced with each recipient's first name on send</span>
              </div>
            )}
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              placeholder="Type your broadcast message..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
            {usePersonalization && finalRecipients.length > 0 && message.includes('{firstName}') && (
              <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <span className="font-medium text-gray-600">Preview: </span>
                {message.replace(/\{firstName\}/g, finalRecipients[0].name.split(' ')[0])}
              </div>
            )}
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
            <div className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-lg">No recipients selected</div>
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
                  
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleCampaignRecords(c.id)}>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={c.message}>{c.message}</td>
                      
                      <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{c.sent_count}/{c.recipients_count}</td>
                      <td className="text-center px-4 py-3 text-red-600">{c.failed_count}/{c.recipients_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.created_by}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                    {expandedCampaignId === c.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-6 py-4">
                          {loadingRecords === c.id ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading recipients...</div>
                          ) : (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Recipients ({campaignRecords[c.id]?.length || 0})</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                                {(campaignRecords[c.id] || []).map((r, i) => (
                                  <div key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded px-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">{i + 1}.</span>
                                      <div>
                                        <div className="font-medium text-gray-800">{r.recipient_name}</div>
                                        <div className="font-mono text-gray-400">{r.recipient_phone}</div>
                                      </div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                                    }`}>{r.status}</span>
                                  </div>
                                ))}
                                {(campaignRecords[c.id] || []).length === 0 && (
                                  <div className="text-sm text-gray-400">No records found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Contacts ───────────────────────────────────────────────────────────

interface Contact {
  id: string
  full_name: string
  phone: string | null
  contact_type: string
  notes: string | null
  created_at: string
}

interface BadDebtContact {
  id: string
  full_name: string
  id_number: string | null
  phone: string | null
  location: string | null
  fee_balance: number | null
  notes: string | null
  created_at: string
}

function parseContactsText(raw: string): { full_name: string; phone: string | null }[] {
  return raw.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Split on tab, multiple spaces, or common delimiters
      const parts = line.split(/\t|  +|,|;/).map(p => p.trim()).filter(Boolean)
      if (parts.length === 0) return null
      // Detect which part is the phone (contains digits and +)
      const phoneIdx = parts.findIndex(p => /[\d]{7,}/.test(p.replace(/[\s+\-()]/g, '')))
      if (phoneIdx === -1) return { full_name: parts[0], phone: null }
      const phone = parts[phoneIdx].replace(/\s/g, '')
      const nameParts = parts.filter((_, i) => i !== phoneIdx)
      return { full_name: nameParts.join(' ') || phone, phone }
    })
    .filter(Boolean) as { full_name: string; phone: string | null }[]
}

// Normalize phone to 2547XXXXXXXX for dedup comparison
// Handles malformed +2540XXXXXXXXX (extra 0 after 254) from some imports
const normalizePhone = (phone: string) => {
  let digits = phone.replace(/\D/g, '')
  // Fix +2540XXXXXXXXX → 254XXXXXXXXX (extra 0 inserted)
  if (digits.startsWith('2540') && digits.length === 13) digits = '254' + digits.slice(4)
  if (digits.startsWith('254') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1)
  if (digits.length === 9) return '254' + digits
  return digits
}

// Store phones as 07XXXXXXXX (local format)
const toLocalFormat = (phone: string) => {
  const norm = normalizePhone(phone)
  if (norm.startsWith('254') && norm.length === 12) return '0' + norm.slice(3)
  return phone.replace(/\D/g, '')
}

function ContactsTab() {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState<{ full_name: string; phone: string | null }[]>([])
  const [saving, setSaving] = useState(false)
  const [removingDupes, setRemovingDupes] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [contactsSubTab, setContactsSubTab] = useState<'clients' | 'bad-debt'>('clients')
  const [typeFilter, setTypeFilter] = useState<'all' | 'placement' | 'non-placement'>('all')
  const [newContactType, setNewContactType] = useState<'placement' | 'non-placement'>('placement')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => { loadContacts() }, [])

  const loadContacts = async () => {
    setLoading(true)
    const { data } = await supabase.from('sms_contacts').select('*').order('full_name')
    setContacts(data || [])
    setLoading(false)
  }

  const handleTextChange = (val: string) => {
    setRawText(val)
    setPreview(parseContactsText(val))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRawText(text)
      setPreview(parseContactsText(text))
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (!preview.length) return
    setSaving(true)

    // Deduplicate against existing contacts by normalized phone
    const existingPhones = new Set(contacts.filter(c => c.phone).map(c => normalizePhone(c.phone!)))
    const newRows = preview
      .filter(p => !p.phone || !existingPhones.has(normalizePhone(p.phone)))
      .map(p => ({ full_name: p.full_name, phone: p.phone ? toLocalFormat(p.phone) : null, contact_type: newContactType, created_by: staff?.name || 'System' }))

    const skipped = preview.length - newRows.length

    if (newRows.length === 0) {
      showToast(`All ${skipped} contacts already exist (duplicate phones skipped)`, 'error')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('sms_contacts').insert(newRows)
    if (error) showToast('Failed to save contacts', 'error')
    else {
      showToast(`${newRows.length} contacts saved${skipped > 0 ? `, ${skipped} duplicates skipped` : ''}`, 'success')
      setRawText(''); setPreview([]); setShowUpload(false)
      loadContacts()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('sms_contacts').delete().eq('id', confirmDelete.id)
    setContacts(prev => prev.filter(c => c.id !== confirmDelete.id))
    showToast('Contact deleted', 'success')
    setConfirmDelete(null)
  }

  const handleClearPhone = async (id: string) => {
    await supabase.from('sms_contacts').update({ phone: null }).eq('id', id)
    setContacts(prev => prev.map(c => c.id === id ? { ...c, phone: null } : c))
  }

  const handleRemoveDuplicates = async () => {
    // Find duplicate phone numbers — keep the oldest (lowest created_at), delete the rest
    const withPhone = contacts.filter(c => c.phone)
    const seen = new Map<string, string>() // normalized phone -> id to keep
    const toDelete: string[] = []

    // Sort by created_at ascending so we keep the first one
    const sorted = [...withPhone].sort((a, b) => a.created_at.localeCompare(b.created_at))
    for (const c of sorted) {
      const norm = normalizePhone(c.phone!)
      if (seen.has(norm)) toDelete.push(c.id)
      else seen.set(norm, c.id)
    }

    if (toDelete.length === 0) {
      showToast('No duplicates found', 'success')
      return
    }

    if (!confirm(`Found ${toDelete.length} duplicate contact(s). Delete them?`)) return
    setRemovingDupes(true)
    const { error } = await supabase.from('sms_contacts').delete().in('id', toDelete)
    if (error) showToast('Failed to remove duplicates', 'error')
    else {
      showToast(`Removed ${toDelete.length} duplicate(s)`, 'success')
      loadContacts()
    }
    setRemovingDupes(false)
  }

  // Count duplicates for badge
  const dupCount = (() => {
    const seen = new Set<string>()
    let count = 0
    for (const c of contacts) {
      if (!c.phone) continue
      const norm = normalizePhone(c.phone)
      if (seen.has(norm)) count++
      else seen.add(norm)
    }
    return count
  })()

  const filtered = contacts.filter(c => {
    if (typeFilter !== 'all' && c.contact_type !== typeFilter) return false
    return c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {([{ id: 'clients', label: 'Clients' }, { id: 'bad-debt', label: 'Bad Debt' }] as const).map(t => (
          <button key={t.id} onClick={() => setContactsSubTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${contactsSubTab === t.id ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {contactsSubTab === 'bad-debt' ? <BadDebtSection /> : (
      <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
        </div>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
          {(['all', 'placement', 'non-placement'] as const).map(t => {
            const count = t === 'all' ? contacts.length : contacts.filter(c => c.contact_type === t).length
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${typeFilter === t ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'all' ? 'All' : t === 'placement' ? 'Placement' : 'Non-Placement'} <span className="text-gray-400">({count})</span>
              </button>
            )
          })}
        </div>
        {dupCount > 0 && (
          <button onClick={handleRemoveDuplicates} disabled={removingDupes}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            Remove {dupCount} Duplicate{dupCount !== 1 ? 's' : ''}
          </button>
        )}
        <button onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 px-3 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90">
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      {showUpload && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Paste names & numbers</p>
              <p className="text-xs text-gray-400">One per line — tab, comma, or space separated. E.g. <span className="font-mono">Jane Doe  +254712345678</span></p>
            </div>
            <div className="ml-auto">
              <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white text-gray-600">
                Upload .txt / .csv
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Contact Type:</span>
            {(['placement', 'non-placement'] as const).map(t => (
              <button key={t} onClick={() => setNewContactType(t)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${newContactType === t ? (t === 'placement' ? 'bg-blue-600 text-white border-blue-600' : 'bg-purple-600 text-white border-purple-600') : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
                {t === 'placement' ? 'Placement' : 'Non-Placement'}
              </button>
            ))}
          </div>
          <textarea value={rawText} onChange={e => handleTextChange(e.target.value)} rows={6}
            placeholder={`Jane Doe\t+254712345678\nJohn Smith\t0723456789`}
            className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">{preview.length} contacts parsed — preview:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                {preview.slice(0, 20).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">{p.full_name}</span>
                    <span className="font-mono text-xs text-gray-500">{p.phone || <span className="text-gray-300">no phone</span>}</span>
                  </div>
                ))}
                {preview.length > 20 && <div className="text-center py-2 text-xs text-gray-400">+{preview.length - 20} more</div>}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !preview.length}
              className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : `Save ${preview.length} Contacts`}
            </button>
            <button onClick={() => { setShowUpload(false); setRawText(''); setPreview([]) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No contacts found</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {c.phone || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      c.contact_type === 'placement' || c.contact_type === 'client' ? 'bg-blue-100 text-blue-700' :
                      c.contact_type === 'non-placement' ? 'bg-purple-100 text-purple-700' :
                      c.contact_type === 'candidate' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.contact_type === 'client' ? 'placement' : c.contact_type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{c.notes || ''}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmDelete({ id: c.id, name: c.full_name })}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Delete contact?</p>
            <p className="text-sm text-gray-500">This will permanently remove <span className="font-medium text-gray-800">{confirmDelete.name}</span>.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}



function BadDebtSection() {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [records, setRecords] = useState<BadDebtContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState({ full_name: '', id_number: '', phone: '', location: '', fee_balance: '', notes: '' })
  const [showBulk, setShowBulk] = useState(false)
  const [bulkRaw, setBulkRaw] = useState('')
  const [bulkPreview, setBulkPreview] = useState<{ full_name: string; id_number: string | null; phone: string | null; location: string | null; fee_balance: number | null; notes: string | null }[]>([])
  const bulkFileRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('bad_debt_contacts').select('*').order('full_name')
    setRecords(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setSaving(true)
    const row = {
      full_name: form.full_name.trim(),
      id_number: form.id_number.trim() || null,
      phone: form.phone.trim() ? toLocalFormat(form.phone.trim()) : null,
      location: form.location.trim() || null,
      fee_balance: form.fee_balance ? parseFloat(form.fee_balance) : null,
      notes: form.notes.trim() || null,
      created_by: staff?.name || 'System',
    }
    const { error } = await supabase.from('bad_debt_contacts').insert(row)
    if (error) showToast('Failed to save', 'error')
    else {
      showToast('Record saved', 'success')
      setForm({ full_name: '', id_number: '', phone: '', location: '', fee_balance: '', notes: '' })
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('bad_debt_contacts').delete().eq('id', confirmDelete.id)
    setRecords(prev => prev.filter(r => r.id !== confirmDelete.id))
    showToast('Record deleted', 'success')
    setConfirmDelete(null)
  }

  const parseBulk = (raw: string) => {
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(/\t|,|;/).map(p => p.trim())
      const [full_name = '', id_number = '', phone = '', location = '', fee_balance_raw = '', notes = ''] = parts
      return {
        full_name,
        id_number: id_number || null,
        phone: phone || null,
        location: location || null,
        fee_balance: fee_balance_raw ? parseFloat(fee_balance_raw.replace(/[^0-9.]/g, '')) || null : null,
        notes: notes || null,
      }
    }).filter(r => r.full_name)
  }

  const handleBulkTextChange = (val: string) => {
    setBulkRaw(val)
    setBulkPreview(parseBulk(val))
  }

  const handleBulkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setBulkRaw(text)
      setBulkPreview(parseBulk(text))
    }
    reader.readAsText(file)
  }

  const handleBulkSave = async () => {
    if (!bulkPreview.length) return
    setSaving(true)
    const rows = bulkPreview.map(r => ({
      ...r,
      phone: r.phone ? toLocalFormat(r.phone) : null,
      created_by: staff?.name || 'System',
    }))
    const { error } = await supabase.from('bad_debt_contacts').insert(rows)
    if (error) showToast('Failed to save bulk records', 'error')
    else {
      showToast(`${rows.length} records saved`, 'success')
      setBulkRaw(''); setBulkPreview([]); setShowBulk(false)
      load()
    }
    setSaving(false)
  }

  const filtered = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').includes(search) ||
    (r.id_number || '').includes(search) ||
    (r.location || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, ID, location..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
        </div>
        <button onClick={() => { setShowBulk(false); setShowForm(f => !f) }}
          className="flex items-center gap-1.5 px-3 py-2 border border-nestalk-primary text-nestalk-primary text-sm rounded-lg hover:bg-nestalk-primary/10">
          <Plus className="w-4 h-4" /> Add Single
        </button>
        <button onClick={() => { setShowForm(false); setShowBulk(b => !b) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90">
          <Plus className="w-4 h-4" /> Bulk Upload
        </button>
      </div>

      {showBulk && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Paste bulk records</p>
              <p className="text-xs text-gray-400">Columns (tab or comma separated): <span className="font-mono">Name, ID Number, Phone, Location, Fee Balance, Notes</span></p>
            </div>
            <div>
              <input ref={bulkFileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleBulkFile} />
              <button onClick={() => bulkFileRef.current?.click()}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white text-gray-600">
                Upload .txt / .csv
              </button>
            </div>
          </div>
          <textarea value={bulkRaw} onChange={e => handleBulkTextChange(e.target.value)} rows={6}
            placeholder={"Jane Doe\t12345678\t0712345678\tNairobi\t5000\tLeft without paying"}
            className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
          {bulkPreview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">{bulkPreview.length} records parsed — preview:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                {bulkPreview.slice(0, 15).map((r, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-800 truncate">{r.full_name}</span>
                    <span className="text-gray-500 font-mono truncate">{r.id_number || '—'}</span>
                    <span className="text-gray-500 font-mono truncate">{r.phone || '—'}</span>
                    <span className="text-gray-500 truncate">{r.location || '—'}</span>
                    <span className="text-red-600 font-semibold">{r.fee_balance != null ? r.fee_balance.toLocaleString() : '—'}</span>
                  </div>
                ))}
                {bulkPreview.length > 15 && <div className="text-center py-2 text-xs text-gray-400">+{bulkPreview.length - 15} more</div>}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleBulkSave} disabled={saving || !bulkPreview.length}
              className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : `Save ${bulkPreview.length} Records`}
            </button>
            <button onClick={() => { setShowBulk(false); setBulkRaw(''); setBulkPreview([]) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700">New Bad Debt Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ID Number</label>
              <input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="12345678" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="0712345678" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="Nairobi" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fee Balance (KES)</label>
              <input type="number" value={form.fee_balance} onChange={e => setForm(f => ({ ...f, fee_balance: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="5000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.full_name.trim()}
              className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Record'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ full_name: '', id_number: '', phone: '', location: '', fee_balance: '', notes: '' }) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">ID No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Location</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Balance (KES)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No records found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id_number || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.location || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">
                    {r.fee_balance != null ? r.fee_balance.toLocaleString() : <span className="text-gray-300 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.notes || ''}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmDelete({ id: r.id, name: r.full_name })}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Delete record?</p>
            <p className="text-sm text-gray-500">This will permanently remove <span className="font-medium text-gray-800">{confirmDelete.name}</span>.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'summary' | 'directions' | 'graduation' | 'weekly' | 'broadcast' | 'contacts'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'summary', label: 'Summary', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'directions', label: 'Directions', icon: <Send className="w-4 h-4" /> },
  { id: 'graduation', label: 'Graduation', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'weekly', label: 'Daily Digest', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'broadcast', label: 'Broadcast', icon: <Radio className="w-4 h-4" /> },
  { id: 'contacts', label: 'Contacts', icon: <BookUser className="w-4 h-4" /> },
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
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">SMS Management</h1>
        <p className="text-sm text-gray-500">Send and track all SMS communications</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-4 md:mb-6 gap-1 scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 md:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-nestalk-primary text-nestalk-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'summary' && <SummaryTab logs={logs} onRefresh={loadLogs} loading={loading} />}
      {activeTab === 'directions' && <DirectionsTab onRefresh={loadLogs} />}
      {activeTab === 'graduation' && <GraduationTab onRefresh={loadLogs} />}
      {activeTab === 'weekly' && <WeeklyTab onRefresh={loadLogs} />}
      {activeTab === 'broadcast' && <BroadcastTab onRefresh={loadLogs} />}
      {activeTab === 'contacts' && <ContactsTab />}
    </div>
  )
}
