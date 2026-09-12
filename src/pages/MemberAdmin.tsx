import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, FileText, CheckCircle, LogOut } from 'lucide-react'

interface MemberWithLogin {
  id: string
  name: string
  phone?: string
  employment_status?: string
  cohort_label?: string
  lastLogin?: string
  loginCount: number
  created_at: string
  niche_training?: { date_started?: string; niche_cohorts?: { cohort_number: number } }
}

// Reuse CoC text from portal
const COC_TEXT = `NESTARA INSTITUTE — CODE OF CONDUCT

As a Nestara-trained professional, I commit to:

1. PROFESSIONALISM
   Arrive on time, dressed appropriately, and ready to work. Notify your employer and Nestara at least 2 hours before any absence.

2. RESPECT & DIGNITY
   Treat every family member, child, and colleague with respect. No shouting, harsh language, or physical discipline of any kind.

3. CONFIDENTIALITY
   Never share family information, photos, or home details with anyone outside the household without written consent.

4. HONESTY & INTEGRITY
   Report any accidents, breakages, or concerns immediately. Do not take items from the home without permission.

5. CHILD SAFETY
   Never leave children unsupervised. Follow all safety protocols taught during training. Report any safeguarding concerns immediately.

6. PHONE & VISITORS
   Keep phone use minimal during working hours. No personal visitors at the workplace without employer approval.

7. CONTINUOUS IMPROVEMENT
   Attend all Nestara meetings and training sessions. Be open to feedback and act on it promptly.

8. NESTARA COMMUNITY
   Represent Nestara with pride. Refer qualified candidates and support fellow members.

By being a Nestara member, you agree to uphold these standards at all times.

— Nestara Institute of Care and Hospitality Excellence`

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getHour() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatJoinDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function MemberView({ member, onClose }: { member: MemberWithLogin; onClose: () => void }) {
  const [showCoc, setShowCoc] = useState(false)
  const firstName = member.name.split(' ')[0]
  const joinDate = member.niche_training?.date_started || member.created_at
  const cohortNum = member.niche_training?.niche_cohorts?.cohort_number

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-50 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        {/* Close */}
        <div className="flex justify-end px-4 pt-4">
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Hero */}
        <div className="bg-nestalk-primary px-6 pt-2 pb-8 mx-4 rounded-2xl shadow-lg mb-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white">
              {firstName[0]?.toUpperCase()}
            </div>
            <p className="text-white/70 text-xs mb-0.5">{getHour()},</p>
            <h2 className="text-white text-xl font-bold mb-2">{firstName} 👋</h2>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-white text-xs">
              <p className="font-medium">Active Nestara Member</p>
              <p className="text-white/70 mt-0.5">
                Since {formatJoinDate(joinDate)}
                {cohortNum ? ` · Cohort ${cohortNum}` : member.cohort_label ? ` · ${member.cohort_label}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-5 space-y-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-800 font-medium">
              {member.employment_status === 'Employed' ? 'Currently Employed' : 'Nestara Graduate'}
            </span>
          </div>

          <button
            onClick={() => setShowCoc(true)}
            className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-full bg-nestalk-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-nestalk-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Code of Conduct</p>
              <p className="text-xs text-gray-500">View professional standards</p>
            </div>
          </button>

          <p className="text-center text-xs text-gray-400 pt-1">Viewing as admin · {member.name}</p>
        </div>
      </div>

      {/* CoC Modal */}
      {showCoc && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Code of Conduct</h2>
              <button onClick={() => setShowCoc(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{COC_TEXT}</pre>
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowCoc(false)} className="w-full py-3 bg-nestalk-primary text-white rounded-xl text-sm font-semibold">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function MemberAdmin() {
  const [members, setMembers] = useState<MemberWithLogin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [previewMember, setPreviewMember] = useState<MemberWithLogin | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [staffRes, loginsRes] = await Promise.all([
      supabase.from('newstaff_members').select(`
        id, name, phone, employment_status, cohort_label, created_at,
        niche_training:niche_training_id(date_started, niche_cohorts:cohort_id(cohort_number))
      `).neq('employment_status', 'Blacklisted').order('name'),
      supabase.from('member_logins').select('staff_id, created_at').order('created_at', { ascending: false }),
    ])

    const logins = loginsRes.data || []
    const loginMap: Record<string, { last: string; count: number }> = {}
    logins.forEach(l => {
      if (!loginMap[l.staff_id]) loginMap[l.staff_id] = { last: l.created_at, count: 0 }
      loginMap[l.staff_id].count++
    })

    const enriched = (staffRes.data || []).map(m => ({
      ...m,
      lastLogin: loginMap[m.id]?.last,
      loginCount: loginMap[m.id]?.count || 0,
    })) as MemberWithLogin[]

    enriched.sort((a, b) => {
      if (a.lastLogin && b.lastLogin) return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
      if (a.lastLogin) return -1
      if (b.lastLogin) return 1
      return a.name.localeCompare(b.name)
    })

    setMembers(enriched)
    setLoading(false)
  }

  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.phone || '').includes(search)
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Member Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Click any member to preview their portal</p>
        </div>
        <a
          href="/member"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 border border-nestalk-primary text-nestalk-primary rounded-lg hover:bg-nestalk-primary/5 transition-colors"
        >
          Open Portal ↗
        </a>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search member..."
        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="divide-x divide-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Member</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Visits</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Last Seen</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
            ) : filtered.map((m, i) => (
              <tr key={m.id} className="hover:bg-gray-50 divide-x divide-gray-100">
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 text-sm">
                    {m.name}
                    {(m.niche_training?.niche_cohorts?.cohort_number || m.cohort_label) && (
                      <span className="ml-1.5 text-[10px] text-orange-500 font-semibold">
                        {m.niche_training?.niche_cohorts?.cohort_number
                          ? `C${m.niche_training.niche_cohorts.cohort_number}`
                          : m.cohort_label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{m.phone}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  {m.loginCount > 0
                    ? <span className="text-xs font-semibold text-nestalk-primary bg-nestalk-primary/10 px-2 py-0.5 rounded-full">{m.loginCount}</span>
                    : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  {m.lastLogin
                    ? <span className="text-gray-600">{timeAgo(m.lastLogin)}</span>
                    : <span className="text-gray-300">Never</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setPreviewMember(m)}
                    className="text-gray-400 hover:text-nestalk-primary transition-colors"
                  >
                    →
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No members found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {previewMember && (
        <MemberView member={previewMember} onClose={() => setPreviewMember(null)} />
      )}
    </div>
  )
}
