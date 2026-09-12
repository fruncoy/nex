import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, LogOut, MoreHorizontal } from 'lucide-react'

interface Member {
  id: string
  name: string
  phone: string
  employment_status?: string
  cohort_label?: string
  created_at: string
  niche_training?: {
    date_started?: string
    niche_cohorts?: { cohort_number: number }
  }
}

const COC_TEXT = `THE NESTARA STAFF CODE OF CONDUCT

SECTION 1: OUR VALUES
1.1  Tell the truth, always. Report your own mistakes immediately. Do not take anything from a client's home that is not yours. Do not lie to Nestara or your employer about your work, hours, or conduct.
1.2  Do your work with care, especially with children and elderly household members. Respect yourself; you are a professional.
1.3  Speak respectfully to your employer and to Nestara. Reply to Nestara promptly, through official channels (Section 5). Raise problems early. What happens in a client's home stays there.
1.4  Attend all trainings and meetings on time. Accept feedback as a tool for growth, not an insult.

SECTION 2: NICHE TRAINING FEES
2.1  Your total NICHE training cost is KES 20,000. If Nestara facilitated your Police Clearance certificate, add KES 1,500 to your first instalment. A registration fee of KES 500 is paid to begin training.
2.2  Job placement is a FREE service. Your training fee is a separate obligation, owed whether or not Nestara is the one who places you in a job.
2.3  Nestara's official instalment plan runs over 3 months. Month 1: KES 10,000. Month 2: KES 5,000 (KES 6,500 if Nestara facilitated your Certificate of Good Conduct). Month 3: KES 5,000. No informal amount is accepted.
2.4  If you are dismissed during probation for breaking this Code of Conduct, Nestara may recover your full outstanding fee balance from your salary before final payment.
2.5  Where a worker breaches this Code of Conduct and defaults on their outstanding training fee balance, Nestara treats this as a serious matter and will refer the file to the Directorate of Criminal Investigations (DCI) and may pursue the matter in a court of law.

SECTION 3: SALARY PAYMENT
3.1  For jobs secured through Nestara, your salary for the first three months is paid by your employer to Nestara, not directly to you.
3.2  Nestara pays your net salary, your agreed salary minus any agreed fee instalment, as follows: if your employer sends your salary between the 25th and 27th, you are paid on the 27th; if your employer sends your salary between the 28th and 31st, you are paid on the 31st; and if your employer sends your salary between the 1st and 5th, you are paid on the 5th of the month.

SECTION 4: CONDUCT AT WORK
4.1  Arrive on time, clean, and properly dressed. If you will be late, contact your employer and Nestara before your start time, through official channels (Section 5).
4.2  Do your duties fully, not the bare minimum. Keep your phone away during work hours unless your employer permits its use. Never ask your employer for an advance, loan, or gift; this is a serious breach in professional boundaries.
4.3  Speak politely to your employer and their family at all times. Respect household privacy and routines. Report problems to Nestara; do not argue with your employer. Do not act with arrogance or acting above your role.
4.4  A child's safety comes first, always. Never leave a child unattended. Physical punishment of a child is never acceptable and is a serious offence. Report any sign of harm or neglect to Nestara immediately.
4.5  Follow the hygiene, lifting, and safety practices from your training. Do not risk injury on tasks beyond your training. Inform your employer and Nestara before your shift if you are sick, or if you are denied nutritious food, safe sleeping space, or a safe work environment.
4.6  You have the right to be safe. No one may touch you, speak to you, or treat you in a sexual way without your consent. Report this to Nestara immediately; you will be supported and protected. You must also keep professional boundaries yourself.
4.7  You keep your own identity documents at all times. No one can force you to stay in a job against your will, though proper notice is still required.
4.8  Everything you see and hear in a client's home is private and stays private, even after your placement ends. Do not share client information, and do not record video of yourself in a client's home.
4.9  Do not tell your employer that they can request a replacement worker from Nestara. That decision is not yours to offer, and doing so is unprofessional.

SECTION 5: OFFICIAL COMMUNICATION
5.1  Nestara's official contacts are +254 714 681 776, +254 714 681 893, +254 142 453 971 and +254 118 000 581
5.2  All contact with Nestara must be by text or WhatsApp text message to these numbers. Do not send voice notes. Do not call or text any Nestara staff member's personal number.
5.3  Nestara holds mandatory online and physical meetings. Attendance is tracked and required. If you cannot attend, inform Nestara in advance with a valid reason. An unexcused absence is a breach of this Section and may lead to withdrawal of placement support.
5.4  Before accepting any job, you must clearly ask about and confirm all key terms with the Client, including but not limited to your day(s) off, location and salary. Once you agree to a job (and its terms), that agreement is final, any change of mind afterward will be treated as a breach of this Agreement and shall be valid grounds for termination.
5.5  Once you have been assessed and assigned a salary based on your skills and experience, you may not request a higher amount after accepting the offer, unless the Client has expressly agreed at the point of hire to increase it after probation. You may not negotiate or change your salary directly with the Client, nor reject or walk away from a placement over salary, provided it meets or exceeds minimum wage.

SECTION 6: CONSEQUENCES
6.1  There are two levels of consequence: Level 1, a warning; Level 2, termination and blacklisting on the Nestara Registry.
6.2  Level 1 conduct includes poor communication, unauthorized voice notes or calls to personal numbers, missed meetings without notice, gossip, lateness, or a defensive attitude to feedback.
6.3  Level 2 conduct includes repeated Level 1 conduct after a warning, breach of confidentiality, dishonesty, laziness with no improvement, or borrowing from an employer.
6.4  Depending on the severity of the breach, a worker who breaches this Code of Conduct may forfeit salary owed for time worked, be expelled from their placement, or both. For all other matters, Nestara exercises its own professional judgement in deciding whether to support or recommend the worker for a future placement.
6.5  Discussing your salary, another staff member's salary, or any internal matter about someone else's job or placement with the Client, other staff, or any third party, speaking negatively about the Client, us, or fellow staff is prohibited. Any breach will result in immediate termination, and deduction of salary.

SECTION 7: REPORTING AND SUPPORT
7.1  If you are treated unfairly, harassed, overworked, or have a problem at your workplace, contact Nestara on the official numbers in Section 6. You may report anonymously.
7.2  Nestara acknowledges reports within 24 hours and resolves or escalates within 48 hours.

By signing below, I agree to be bound by this Code of Conduct in full.`

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2540') && digits.length === 13) return '254' + digits.slice(4)
  if (digits.startsWith('254') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1)
  if (digits.length === 9) return '254' + digits
  return digits
}

function getHour() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatJoinDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function MemberPortal() {
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCoc, setShowCoc] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const digits = phone.replace(/\D/g, '')
    const norm = normalizePhone(digits)
    const variants = [
      norm,
      '0' + norm.slice(3),
      '+' + norm,
      digits,
    ]

    const { data, error: dbErr } = await supabase
      .from('newstaff_members')
      .select(`
        id, name, phone, employment_status, cohort_label, created_at,
        niche_training:niche_training_id(date_started, niche_cohorts:cohort_id(cohort_number))
      `)
      .or(variants.map(v => `phone.eq.${v}`).join(','))
      .neq('employment_status', 'Blacklisted')
      .single()

    setLoading(false)

    if (dbErr || !data) {
      setError('No member found with that phone number. Please check and try again.')
      return
    }

    setMember(data as Member)

    // Log the visit (fire and forget)
    supabase.from('member_logins').insert({
      staff_id: data.id,
      phone: data.phone,
      name: data.name,
    }).then(() => {})
  }

  const firstName = member?.name?.split(' ')[0] || ''
  const joinDate = member?.niche_training?.date_started || member?.created_at
  const cohortNum = member?.niche_training?.niche_cohorts?.cohort_number

  if (member) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header card — rounded, spaced from edges */}
        <div className="px-4 pt-6 max-w-sm mx-auto w-full">
          <div className="bg-nestalk-primary rounded-2xl px-6 py-8">
            <h1 className="text-2xl font-bold text-white">{getHour()}, {firstName}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-6 max-w-sm mx-auto w-full space-y-4">

          {/* Member card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Full Name</span>
                <span className="text-sm font-semibold text-gray-900">{member.name}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Status</span>
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Cohort</span>
                <span className="text-sm font-medium text-gray-700">
                  {cohortNum ? `Cohort ${cohortNum}` : member.cohort_label || '—'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Member Since</span>
                <span className="text-sm font-medium text-gray-700">{formatJoinDate(joinDate!)}</span>
              </div>
            </div>
          </div>

          {/* CoC button */}
          <button
            onClick={() => setShowCoc(true)}
            className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Code of Conduct</p>
              <p className="text-xs text-gray-500">View your signed copy of the agreement</p>
            </div>
            <span className="text-[10px] font-medium text-nestalk-primary bg-white border border-nestalk-primary/20 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">View</span>
          </button>

        </div>

        {/* CoC full page */}
        {showCoc && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowCoc(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-sm font-semibold text-gray-800">Nestara Code of Conduct</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-6">
              <div className="space-y-8 max-w-lg mx-auto">
                {COC_TEXT.split('\n\n').filter(b => !b.startsWith('THE NESTARA') && !b.startsWith('By signing')).map((block, i) => {
                  const lines = block.split('\n').filter(l => l.trim())
                  const isHeading = lines[0]?.startsWith('SECTION')
                  return (
                    <div key={i} className="space-y-3">
                      {isHeading && (
                        <p className="text-xs font-bold uppercase tracking-widest text-nestalk-primary">{lines[0]}</p>
                      )}
                      {(isHeading ? lines.slice(1) : lines).map((l, j) => (
                        <p key={j} className="text-sm leading-relaxed text-gray-700">{l}</p>
                      ))}
                    </div>
                  )
                })}
                <div className="pt-4 pb-8 border-t border-gray-100">
                  <p className="text-sm text-gray-500">{member.name} has signed a physical copy of this Code of Conduct and is bound by it in full.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating action button */}
        <div className="fixed bottom-6 right-6">
          {showMenu && (
            <div className="mb-3 flex flex-col items-end gap-2">
              <button
                onClick={() => { setMember(null); setPhone(''); setShowMenu(false) }}
                className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2 text-xs font-medium text-gray-700"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-500" />
                Sign out
              </button>
            </div>
          )}
          <button
            onClick={() => setShowMenu(p => !p)}
            className="w-10 h-10 bg-nestalk-primary rounded-full shadow-xl flex items-center justify-center"
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>


      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Nestara Member Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your phone number to continue</p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 12)); setError('') }}
            placeholder="e.g. 0712345678"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-nestalk-primary focus:border-nestalk-primary"
            autoComplete="tel"
            inputMode="numeric"
          />
          {error && <p className="text-xs text-red-500 -mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, '').length < 9}
            className="w-full py-3.5 bg-nestalk-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Looking up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
