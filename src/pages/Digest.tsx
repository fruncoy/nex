import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Radio, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const serif = { fontFamily: "'Playfair Display', serif" }
const sans = { fontFamily: "'Inter', sans-serif" }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

interface TraineeScore {
  id: string
  name: string
  avgScore: number
  dayScores: Record<number, number>
  trend: 'improving' | 'declining' | 'stable' | 'new'
  recommendation?: string
  redFlag: boolean
  bestPillar: string
  practicalAvg: number
}

interface EquipmentScore {
  label: string
  avg: number
  count: number
}

interface DigestData {
  totalInquiriesThisMonth: number
  totalThisWeek: number
  totalLost: number
  lostBreakdown: { reason: string; count: number }[]
  topSource: string
  topRole: string
  activeInTraining: number
  graduated: number
  expelled: number
  blacklisted: number
  activeCohortNumber: number
  activeCohortDaysRemaining: number
  totalActiveTrainees: number
  assessmentCompletionRate: number
  topPerformers: TraineeScore[]
  needsAttention: TraineeScore[]
  mostImproved: TraineeScore[]
  dayToppers: { day: number; name: string; score: number; pillars: { pillar: string; score: number }[] }[]
  practicalTopper: { name: string; week1: number; week2: number; overall: number; topCategory: string } | null
  pillarStrengths: { pillar: string; avg: number }[]
  pillarAvgs: { pillar: string; avg: number; day: number }[]
  topEquipment: EquipmentScore[]
  weakEquipment: EquipmentScore[]
  practicals: any[]
  equipmentKeys: { key: string; label: string }[]
  nameMap: Record<string, string>
}

export function Digest() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const PILLARS = ['Professional Conduct', 'Cooking', 'Childcare', 'Housekeeping']

      // ── Candidates ──
      const { data: allCandidates } = await supabase
        .from('niche_candidates')
        .select('status, source, role, inquiry_date')

      const thisMonth = allCandidates?.filter(c => new Date(c.inquiry_date) >= startOfMonth && new Date(c.inquiry_date) <= now) || []
      const thisWeek = allCandidates?.filter(c => new Date(c.inquiry_date) >= startOfWeek && new Date(c.inquiry_date) <= now) || []
      const lost = thisMonth.filter(c => c.status?.startsWith('Lost'))

      const lostMap: Record<string, number> = {}
      lost.forEach(c => { const r = c.status.replace('Lost - ', ''); lostMap[r] = (lostMap[r] || 0) + 1 })
      const lostBreakdown = Object.entries(lostMap).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)

      const sourceMap: Record<string, number> = {}
      thisMonth.forEach(c => { if (c.source) sourceMap[c.source] = (sourceMap[c.source] || 0) + 1 })
      const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const roleMap: Record<string, number> = {}
      thisMonth.forEach(c => { if (c.role) roleMap[c.role] = (roleMap[c.role] || 0) + 1 })
      const topRole = Object.entries(roleMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const activeInTraining = thisMonth.filter(c => c.status === 'Active in Training').length
      const graduated = thisMonth.filter(c => c.status === 'Graduated').length
      const blacklisted = thisMonth.filter(c => c.status === 'BLACKLISTED').length

      // Expelled this month from niche_training
      const { data: expelledTrainees } = await supabase
        .from('niche_training')
        .select('id, created_at')
        .eq('status', 'Expelled')
      const expelled = expelledTrainees?.filter(t => {
        const d = new Date(t.created_at)
        return d >= startOfMonth && d <= now
      }).length || 0

      // ── Active Cohort ──
      const { data: activeCohort } = await supabase
        .from('niche_cohorts').select('*').eq('status', 'active').single()

      const cohortId = activeCohort?.id || ''

      // ── Trainees in active cohort ──
      const { data: cohortTrainees } = await supabase
        .from('niche_training')
        .select('id, name, status')
        .eq('cohort_id', cohortId)

      const traineeIds = cohortTrainees?.map(t => t.id) || []
      const activeCount = cohortTrainees?.filter(t => t.status === 'Active').length || 0
      const nameMap: Record<string, string> = {}
      cohortTrainees?.forEach(t => { nameMap[t.id] = t.name })

      // ── Progress Assessments (filtered to cohort trainees) ──
      const { data: assessments } = traineeIds.length > 0
        ? await supabase
            .from('niche_progress_assessments')
            .select('trainee_id, assessment_day, question_1_score, question_2_score, question_3_score, question_4_score')
            .in('trainee_id', traineeIds)
        : { data: [] as any[] }

      const totalExpected = activeCount * 4
      const completionRate = totalExpected > 0 ? ((assessments?.length || 0) / totalExpected) * 100 : 0

      // Build per-trainee day scores
      const scoreMap: Record<string, Record<number, number>> = {}
      assessments?.forEach(a => {
        const sc = [a.question_1_score, a.question_2_score, a.question_3_score, a.question_4_score]
          .filter(s => s != null && s > 0) as number[]
        if (sc.length > 0) {
          if (!scoreMap[a.trainee_id]) scoreMap[a.trainee_id] = {}
          scoreMap[a.trainee_id][a.assessment_day] = sc.reduce((s, v) => s + v, 0) / sc.length
        }
      })

      // ── Practical Assessments (fetch BEFORE traineeList) ──
      const { data: practicals } = traineeIds.length > 0
        ? await supabase.from('niche_practical_assessments').select('*').in('trainee_id', traineeIds)
        : { data: [] as any[] }

      const equipmentKeys = [
        { key: 'oven_score', label: 'Oven' },
        { key: 'microwave_score', label: 'Microwave' },
        { key: 'coffee_maker_score', label: 'Coffee Maker' },
        { key: 'sandwich_maker_score', label: 'Sandwich Maker' },
        { key: 'toaster_score', label: 'Toaster' },
        { key: 'fryer_score', label: 'Fryer' },
        { key: 'blender_score', label: 'Blender' },
        { key: 'gas_cooker_score', label: 'Gas Cooker' },
        { key: 'cylinder_score', label: 'Cylinder' },
        { key: 'fridge_score', label: 'Fridge' },
        { key: 'freezer_score', label: 'Freezer' },
        { key: 'water_purifier_score', label: 'Water Purifier' },
        { key: 'water_dispensers_score', label: 'Water Dispensers' },
        { key: 'washing_machines_score', label: 'Washing Machine' },
        { key: 'vacuum_cleaner_score', label: 'Vacuum Cleaner' },
        { key: 'dishwasher_score', label: 'Dishwasher' },
        { key: 'polishing_machine_score', label: 'Polishing Machine' },
        { key: 'floor_scrubber_score', label: 'Floor Scrubber' },
        { key: 'steam_vapour_machine_score', label: 'Steam Vapour' },
        { key: 'floor_polisher_score', label: 'Floor Polisher' },
        { key: 'carpet_shampooer_score', label: 'Carpet Shampooer' },
        { key: 'bed_vacuum_score', label: 'Bed Vacuum' },
      ]

      // Per-trainee practical avg
      const practicalAvgMap: Record<string, number> = {}
      practicals?.forEach(p => {
        if (!practicalAvgMap[p.trainee_id]) practicalAvgMap[p.trainee_id] = 0
        const existing = practicalAvgMap[p.trainee_id]
        practicalAvgMap[p.trainee_id] = existing > 0 ? (existing + (p.overall_score || 0)) / 2 : (p.overall_score || 0)
      })

      // TraineeList — only trainees with at least 1 assessment
      const traineeList: TraineeScore[] = traineeIds
        .filter(id => scoreMap[id] && Object.keys(scoreMap[id]).length > 0)
        .map(id => {
          const dayScores = scoreMap[id]
          const days = Object.keys(dayScores).map(Number).sort()
          const assessAvg = days.reduce((s, d) => s + dayScores[d], 0) / days.length
          const practicalAvg = practicalAvgMap[id] || 0
          // Combined score for ranking: pure assessment avg only (practical shown separately)
          const avgScore = assessAvg
          const trend: TraineeScore['trend'] = days.length >= 2
            ? dayScores[days[days.length - 1]] - dayScores[days[0]] >= 0.5 ? 'improving'
            : dayScores[days[days.length - 1]] - dayScores[days[0]] <= -0.5 ? 'declining' : 'stable'
            : 'stable'
          // Best pillar across all days
          const pillarTotals = [0, 0, 0, 0]
          const pillarCounts = [0, 0, 0, 0]
          assessments?.filter(a => a.trainee_id === id).forEach(a => {
            const qs = [a.question_1_score, a.question_2_score, a.question_3_score, a.question_4_score]
            qs.forEach((q, i) => { if (q && q > 0) { pillarTotals[i] += q; pillarCounts[i]++ } })
          })
          const pillarAvgsArr = pillarTotals.map((t, i) => pillarCounts[i] > 0 ? t / pillarCounts[i] : 0)
          const bestPillarIdx = pillarAvgsArr.indexOf(Math.max(...pillarAvgsArr))
          const bestPillar = PILLARS[bestPillarIdx] || ''
          return {
            id, name: nameMap[id] || 'Unknown', avgScore, dayScores, trend,
            recommendation: undefined, redFlag: Object.values(dayScores).some(s => s <= 2),
            bestPillar, practicalAvg
          }
        })

      const sorted = [...traineeList].sort((a, b) => b.avgScore - a.avgScore)
      const topPerformers = sorted.slice(0, 3)
      const needsAttention = traineeList
        .filter(t => {
          const days = Object.keys(t.dayScores).map(Number).sort()
          if (days.length < 2) return false
          return t.dayScores[days[days.length - 1]] < t.dayScores[days[0]]
        })
        .sort((a, b) => {
          const ad = Object.keys(a.dayScores).map(Number).sort()
          const bd = Object.keys(b.dayScores).map(Number).sort()
          const aDrop = a.dayScores[ad[0]] - a.dayScores[ad[ad.length - 1]]
          const bDrop = b.dayScores[bd[0]] - b.dayScores[bd[bd.length - 1]]
          return bDrop - aDrop
        })
        .slice(0, 3)
      const mostImproved = traineeList
        .filter(t => t.trend === 'improving')
        .sort((a, b) => {
          const ad = Object.keys(a.dayScores).map(Number).sort()
          const bd = Object.keys(b.dayScores).map(Number).sort()
          return (b.dayScores[bd[bd.length - 1]] - b.dayScores[bd[0]]) - (a.dayScores[ad[ad.length - 1]] - a.dayScores[ad[0]])
        }).slice(0, 3)

      // Who topped each day
      const dayToppers = [1, 3, 5, 10].map(day => {
        const da = assessments?.filter(a => a.assessment_day === day) || []
        if (!da.length) return null
        const top = da.map(a => {
          const sc = [a.question_1_score, a.question_2_score, a.question_3_score, a.question_4_score]
            .filter(s => s != null && s > 0) as number[]
          return { id: a.trainee_id, avg: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0, raw: a }
        }).sort((a, b) => b.avg - a.avg)[0]
        const pillars = [
          { pillar: 'Professional Conduct', score: top.raw.question_1_score || 0 },
          { pillar: 'Cooking', score: top.raw.question_2_score || 0 },
          { pillar: 'Childcare', score: top.raw.question_3_score || 0 },
          { pillar: 'Housekeeping', score: top.raw.question_4_score || 0 },
        ].filter(p => p.score > 0)
        return { day, name: nameMap[top.id] || 'Unknown', score: top.avg, pillars }
      }).filter(Boolean) as { day: number; name: string; score: number; pillars: { pillar: string; score: number }[] }[]
      const pillarStrengths = PILLARS.map((pillar, i) => {
        const key = `question_${i + 1}_score` as keyof typeof assessments[0]
        const sc = (assessments || []).map(a => a[key] as number).filter(s => s != null && s > 0)
        return { pillar, avg: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0 }
      }).filter(p => p.avg > 0).sort((a, b) => b.avg - a.avg)

      // Pillar avgs at latest day
      const latestDay = assessments?.length ? Math.max(...assessments.map(a => a.assessment_day)) : 1
      const pillarAvgs = PILLARS.map((pillar, i) => {
        const key = `question_${i + 1}_score` as keyof typeof assessments[0]
        const sc = (assessments || []).filter(a => a.assessment_day === latestDay).map(a => a[key] as number).filter(s => s != null && s > 0)
        return { pillar, avg: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0, day: latestDay }
      }).filter(p => p.avg > 0)

      const equipmentScores: EquipmentScore[] = equipmentKeys.map(({ key, label }) => {
        const sc = practicals?.map(p => p[key] as number).filter(Boolean) || []
        return { label, avg: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0, count: sc.length }
      }).filter(e => e.count > 0).sort((a, b) => b.avg - a.avg)

      const topEquipment = equipmentScores.slice(0, 5)
      const weakEquipment = [...equipmentScores].sort((a, b) => a.avg - b.avg).slice(0, 5)

      const equipmentCategories: Record<string, string[]> = {
        Kitchen: ['oven_score','microwave_score','coffee_maker_score','sandwich_maker_score','toaster_score','fryer_score','blender_score','gas_cooker_score','cylinder_score'],
        Refrigeration: ['fridge_score','freezer_score','water_purifier_score','water_dispensers_score'],
        'Laundry & Cleaning': ['washing_machines_score','vacuum_cleaner_score','dishwasher_score'],
        'Floor Care': ['polishing_machine_score','floor_scrubber_score','steam_vapour_machine_score','floor_polisher_score','carpet_shampooer_score','bed_vacuum_score'],
      }

      const practicalTopper = (() => {
        if (!practicals?.length) return null
        // Per trainee: week1, week2, overall avg
        const byTrainee: Record<string, { w1: number; w2: number }> = {}
        practicals.forEach(p => {
          if (!byTrainee[p.trainee_id]) byTrainee[p.trainee_id] = { w1: 0, w2: 0 }
          if (p.assessment_week === 1) byTrainee[p.trainee_id].w1 = p.overall_score || 0
          if (p.assessment_week === 2) byTrainee[p.trainee_id].w2 = p.overall_score || 0
        })
        const ranked = Object.entries(byTrainee).map(([id, { w1, w2 }]) => {
          const scores = [w1, w2].filter(s => s > 0)
          return { id, w1, w2, overall: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0 }
        }).sort((a, b) => b.overall - a.overall)
        const top = ranked[0]
        if (!top || top.overall === 0) return null
        // Find top category for this trainee
        const topPractical = practicals.filter(p => p.trainee_id === top.id)
        let topCategory = ''
        let topCatScore = 0
        Object.entries(equipmentCategories).forEach(([cat, keys]) => {
          topPractical.forEach(p => {
            const sc = keys.map(k => p[k] as number).filter(Boolean)
            const avg = sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0
            if (avg > topCatScore) { topCatScore = avg; topCategory = cat }
          })
        })
        return { name: nameMap[top.id] || 'Unknown', week1: top.w1, week2: top.w2, overall: top.overall, topCategory }
      })()

      setData({
        totalInquiriesThisMonth: thisMonth.length,
        totalThisWeek: thisWeek.length,
        totalLost: lost.length,
        lostBreakdown,
        topSource,
        topRole,
        activeInTraining,
        graduated,
        expelled,
        blacklisted,
        activeCohortNumber: activeCohort?.cohort_number || 0,
        activeCohortDaysRemaining: activeCohort
          ? Math.max(0, Math.ceil((new Date(activeCohort.end_date).getTime() - Date.now()) / 86400000))
          : 0,
        totalActiveTrainees: activeCount,
        assessmentCompletionRate: completionRate,
        topPerformers,
        needsAttention,
        mostImproved,
        dayToppers,
        practicalTopper,
        pillarStrengths,
        pillarAvgs,
        topEquipment,
        weakEquipment,
        practicals: practicals || [],
        equipmentKeys,
        nameMap,
      })
    } catch (err) {
      console.error('Digest error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = () => {
    const d = new Date()
    return `Day ${d.getDate()} of ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`
  }

  const ScoreBar = ({ score }: { score: number }) => (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-400'}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right" style={sans}>{score.toFixed(1)}</span>
    </div>
  )

  const TrendBadge = ({ trend }: { trend: TraineeScore['trend'] }) => {
    const map = {
      improving: { label: '↑ Improving', cls: 'bg-green-100 text-green-700' },
      declining: { label: '↓ Declining', cls: 'bg-red-100 text-red-700' },
      stable: { label: '→ Stable', cls: 'bg-gray-100 text-gray-600' },
      new: { label: 'New', cls: 'bg-blue-100 text-blue-600' },
    }
    const { label, cls } = map[trend]
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`} style={sans}>{label}</span>
  }

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="border border-gray-200 shadow-sm animate-pulse" style={{ backgroundColor: '#FDFCFA' }}>
          <div className="border-b-4 border-gray-100 py-10 px-6 sm:px-10 text-center">
            <div className="h-3 bg-gray-100 rounded w-64 mx-auto mb-4" />
            <div className="h-12 bg-gray-100 rounded w-80 mx-auto mb-4" />
            <div className="h-3 bg-gray-100 rounded w-40 mx-auto" />
          </div>
          <div className="py-12 px-6 sm:px-10 space-y-16">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-8 bg-gray-100 rounded w-48 mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[1,2,3,4].map(j => <div key={j} className="bg-gray-100 h-24 rounded" />)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1,2].map(j => <div key={j} className="bg-gray-100 h-20 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400" style={sans}>No data available</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="border border-gray-200 shadow-sm" style={{ backgroundColor: '#FDFCFA' }}>

        <header className="border-b-4 border-[#AE491E] py-10 px-6 sm:px-10 text-center">
          <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3" style={sans}>
            Nestara Institute of Care and Hospitality Excellence
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 leading-tight" style={serif}>
            Nestara Daily Digest
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <p className="text-sm text-gray-500" style={sans}>{formatDate()}</p>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#AE491E]" style={sans}>
              <Radio className="w-3 h-3 animate-pulse" /> Live Data
            </span>
          </div>
        </header>

        <main className="py-12 px-6 sm:px-10 space-y-16">

          {/* Section 1: Candidate Pipeline */}
          <section>
            <SectionTitle>Candidate Pipeline</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white border border-gray-100 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2" style={sans}>Inquiries This Month</p>
                <p className="text-4xl font-bold text-gray-900" style={serif}>{data.totalInquiriesThisMonth}</p>
                <p className="text-xs text-gray-400 mt-2" style={sans}>this week: {data.totalThisWeek}</p>
              </div>
              <Stat label="Lost This Month" value={data.totalLost} accent />
              <Stat label="In Training" value={data.activeInTraining} />
              <Stat label="Graduated" value={data.graduated} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-8">
              <Stat label="Expelled" value={data.expelled} accent />
              <Stat label="Blacklisted" value={data.blacklisted} accent />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#FFF7ED] border-l-4 border-[#AE491E] p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1" style={sans}>Top Source</p>
                <p className="text-2xl font-bold text-[#AE491E]" style={serif}>{data.topSource}</p>
              </div>
              <div className="bg-[#FFF7ED] border-l-4 border-[#AE491E] p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1" style={sans}>Most Applied Role</p>
                <p className="text-2xl font-bold text-[#AE491E]" style={serif}>{data.topRole}</p>
              </div>
            </div>
            {data.lostBreakdown.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3" style={sans}>Why Candidates Are Lost</p>
                <div className="space-y-2">
                  {data.lostBreakdown.map(({ reason, count }) => (
                    <div key={reason} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-36 shrink-0" style={sans}>{reason}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-[#AE491E] h-2 rounded-full" style={{ width: `${(count / data.totalLost) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-5 text-right" style={sans}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Active Cohort */}
          <section>
            <SectionTitle>Active Cohort — {ROMAN[data.activeCohortNumber] || data.activeCohortNumber}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <Stat label="Active Trainees" value={data.totalActiveTrainees} />
              <Stat label="Days Remaining" value={data.activeCohortDaysRemaining} />
              <div className="bg-white border border-gray-100 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2" style={sans}>Assessments Done</p>
                <p className="text-4xl font-bold text-gray-900" style={serif}>{data.assessmentCompletionRate.toFixed(0)}%</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-[#AE491E] h-1.5 rounded-full" style={{ width: `${data.assessmentCompletionRate}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Trainee Performance */}
          <section>
            <SectionTitle>Trainee Performance</SectionTitle>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={sans}>Who Topped Each Day</p>
            <div className={`grid grid-cols-2 gap-3 mb-8 ${
                data.dayToppers.length >= 4 ? 'sm:grid-cols-4' :
                data.dayToppers.length === 3 ? 'sm:grid-cols-3' :
                data.dayToppers.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
              }`}>
              {[1, 3, 5, 10].map(day => {
                const topper = data.dayToppers.find(d => d.day === day)
                if (!topper) return null
                return (
                  <div key={day} className="bg-gray-50 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1" style={sans}>Day {day}</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight" style={sans}>{topper.name}</p>
                    <p className="text-xs text-[#AE491E] font-semibold mt-1 mb-2" style={sans}>{topper.score.toFixed(1)}/5</p>
                    <div className="space-y-1">
                      {topper.pillars.map(p => (
                        <div key={p.pillar} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 truncate" style={sans}>{p.pillar}</span>
                          <span className={`text-xs font-bold ml-1 shrink-0 ${p.score >= 4 ? 'text-green-600' : p.score >= 3 ? 'text-yellow-600' : 'text-red-500'}`} style={sans}>{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {data.practicals.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4" style={sans}>Appliance Use Performance</p>
                <div className={`grid gap-4 ${
                    data.practicals.filter(p => p.assessment_week === 2).length === 0 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}>
                  {/* Week 1 */}
                  <div className="bg-gray-50 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3" style={sans}>Week 1 Top</p>
                    {data.practicals.filter(p => p.assessment_week === 1).length === 0
                      ? <p className="text-xs text-gray-300" style={sans}>No data</p>
                      : data.practicals.filter(p => p.assessment_week === 1)
                          .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                          .slice(0, 3)
                          .map(p => (
                            <div key={p.trainee_id} className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-900 truncate" style={sans}>{data.nameMap[p.trainee_id] || 'Unknown'}</span>
                              <span className="text-xs font-bold text-[#AE491E] ml-1 shrink-0" style={sans}>{(p.overall_score || 0).toFixed(1)}</span>
                            </div>
                          ))
                    }
                  </div>
                  {/* Week 2 — only show if data exists */}
                  {data.practicals.filter(p => p.assessment_week === 2).length > 0 && (
                  <div className="bg-gray-50 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3" style={sans}>Week 2 Top</p>
                    {data.practicals.filter(p => p.assessment_week === 2)
                        .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.trainee_id} className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-900 truncate" style={sans}>{data.nameMap[p.trainee_id] || 'Unknown'}</span>
                            <span className="text-xs font-bold text-[#AE491E] ml-1 shrink-0" style={sans}>{(p.overall_score || 0).toFixed(1)}</span>
                          </div>
                        ))
                    }
                  </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section: Overall Top — based on assessment scores across all days */}
          <section>
            <SectionTitle>Overall Top</SectionTitle>
            {(() => {
              // Rank by average assessment score across ALL days (pure assessment, not practical)
              const ranked = [...(data.topPerformers)]
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 3)
              if (ranked.length === 0)
                return <p className="text-xs text-gray-400" style={sans}>No assessment data yet</p>
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {ranked.map((t, i) => (
                    <div key={t.id} className="bg-white border border-gray-100 p-5">
                      <p className="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2" style={sans}>#{i + 1}</p>
                      <p className="text-2xl font-bold text-gray-900 mb-1" style={serif}>{t.name}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <ScoreBar score={t.avgScore} />
                        <TrendBadge trend={t.trend} />
                      </div>
                      <div className="space-y-1">
                        {Object.entries(t.dayScores).sort(([a], [b]) => Number(a) - Number(b)).map(([day, score]) => (
                          <div key={day} className="flex items-center justify-between">
                            <span className="text-xs text-gray-400" style={sans}>Day {day}</span>
                            <span className={`text-xs font-bold ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`} style={sans}>{score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                      {t.bestPillar && <p className="text-xs text-gray-400 mt-2" style={sans}>Best: {t.bestPillar}</p>}
                    </div>
                  ))}
                </div>
              )
            })()}
          </section>

          {/* Section: Most Improved */}
          <section>
            <SectionTitle>Most Improved</SectionTitle>
            {data.mostImproved.length === 0
              ? <p className="text-xs text-gray-400" style={sans}>Need 2+ assessment days to calculate improvement</p>
              : <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {data.mostImproved.map((t, i) => {
                    const days = Object.keys(t.dayScores).map(Number).sort()
                    const gain = days.length >= 2 ? (t.dayScores[days[days.length - 1]] - t.dayScores[days[0]]).toFixed(1) : '—'
                    const from = days.length >= 2 ? t.dayScores[days[0]].toFixed(1) : '—'
                    const to = days.length >= 2 ? t.dayScores[days[days.length - 1]].toFixed(1) : '—'
                    return (
                      <div key={t.id} className="bg-white border border-gray-100 p-5">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2" style={sans}>#{i + 1}</p>
                        <p className="text-2xl font-bold text-gray-900 mb-1" style={serif}>{t.name}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-400" style={sans}>{from} → {to}</span>
                          <span className="text-sm font-bold text-green-600" style={sans}>+{gain}</span>
                        </div>
                        <ScoreBar score={t.avgScore} />
                        {t.bestPillar && <p className="text-xs text-gray-400 mt-2" style={sans}>Best: {t.bestPillar}</p>}
                      </div>
                    )
                  })}
                </div>
            }
            {data.needsAttention.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-1" style={sans}>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Dropped / At Risk
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.needsAttention.map(t => (
                    <div key={t.id} className="bg-white border border-red-100 p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-1" style={sans}>{t.name}</p>
                      <ScoreBar score={t.avgScore} />
                      <TrendBadge trend={t.trend} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Practical Skills */}
          {data.topEquipment.length > 0 && (
            <section>
              <SectionTitle>Appliance Use — Equipment Scores</SectionTitle>
              {[1, 2].map(weekNum => {
                const wPracticals = data.practicals.filter(p => p.assessment_week === weekNum)
                if (!wPracticals.length) return null
                const wEquip = data.equipmentKeys.map(({ key, label }) => {
                  const sc = wPracticals.map(p => p[key] as number).filter(Boolean)
                  return { label, avg: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : 0, count: sc.length }
                }).filter(e => e.count > 0).sort((a, b) => b.avg - a.avg)
                return (
                  <div key={weekNum} className="mb-10">
                    <p className="text-sm font-semibold text-gray-700 mb-3" style={sans}>Week {weekNum}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2" style={sans}>Strongest</p>
                        <div className="space-y-2">
                          {wEquip.slice(0, 5).map(e => (
                            <div key={e.label} className="flex items-center gap-3">
                              <span className="text-xs text-gray-600 w-32 shrink-0" style={sans}>{e.label}</span>
                              <ScoreBar score={e.avg} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2" style={sans}>Needs Practice</p>
                        <div className="space-y-2">
                          {[...wEquip].sort((a, b) => a.avg - b.avg).slice(0, 5).map(e => (
                            <div key={e.label} className="flex items-center gap-3">
                              <span className="text-xs text-gray-600 w-32 shrink-0" style={sans}>{e.label}</span>
                              <ScoreBar score={e.avg} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

        </main>

        <footer className="border-t border-gray-200 py-8 px-6 sm:px-10 text-center">
          <div className="flex items-center justify-center gap-4">
            <a href="/niche-reports" className="text-xs text-gray-400 hover:text-[#AE491E] transition-colors" style={sans}>Reports</a>
            <span className="text-gray-200">|</span>
            <a href="/niche-progress" className="text-xs text-gray-400 hover:text-[#AE491E] transition-colors" style={sans}>Progress</a>
            <span className="text-gray-200">|</span>
            <a href="/niche-grading" className="text-xs text-gray-400 hover:text-[#AE491E] transition-colors" style={sans}>Grading</a>
          </div>
        </footer>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-3">
      <div className="w-1.5 h-7 bg-[#AE491E] shrink-0" />
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
        {children}
      </h2>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-100 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>{label}</p>
      <p className={`text-4xl font-bold ${accent ? 'text-[#AE491E]' : 'text-gray-900'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </p>
    </div>
  )
}
