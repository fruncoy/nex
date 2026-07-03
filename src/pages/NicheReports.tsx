import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { ChevronDown, Download } from 'lucide-react'
import { formatDateWithOrdinal } from '../utils/dateFormat'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateRange {
  from: string
  to: string
}

interface VolumeMetrics {
  totalTrainees: number
  graduated: number
  twoWeekTrainees: number
  shortCourseTrainees: number
  completed: number
  active: number
  twoWeekActive: number
  shortActive: number
  expelled: number
  blacklisted: number
}

interface FunnelMetrics {
  totalInquiries: number
  joinedTraining: number
  joinRate: number
  graduationRate: number
  totalLost: number
  lostReasons: { reason: string; count: number }[]
  sourceBreakdown: { source: string; count: number }[]
  roleBreakdown: { role: string; count: number }[]
  twoWeekTrainees: number
  shortCourseTrainees: number
}

interface FinanceMetrics {
  totalRevenue: number
  cash: number
  mpesa: number
  bankTransfer: number
  card: number
  sponsored: number
  outstanding: number
  totalFees: number
  collectionRate: number
  extraCharges: number
  badDebt: number
}

interface CourseRow {
  name: string
  enrolled: number
  graduated: number
  expelled: number
  active: number
  pending: number
  outstandingFees: number
  totalFees: number
  collected: number
}

interface CohortBar {
  cohort_number: number
  twoWeek: number
  shortCourse: number
  revenue: number
  graduated: number
}

interface MonthRow {
  month: string
  enrolled: number
  graduated: number
  revenue: number
  lost: number
  graduationRate: number
  shortEnrolled: number
  twoWeekEnrolled: number
}

interface DailyAssessment {
  trainee_id: string
  assessment_day: number
  question_1_score: number | null
  question_2_score: number | null
  question_3_score: number | null
  question_4_score: number | null
  question_5_score: number | null
  total_score?: number
}

interface FinalGrade {
  trainee_id: string
  final_score?: number
  tier?: string
  pillar1_score?: number
  pillar2_score?: number
  pillar3_score?: number
  pillar4_score?: number
}

interface PerCohortData {
  cohort_number: number
  cohort_id: string
  start_date: string
  end_date: string
  status: string
  totalTrainees: number
  graduated: number
  expelled: number
  active: number
  twoWeek: number
  shortCourse: number
  totalFees: number
  collected: number
  sponsored: number
  outstanding: number
  cash: number
  mpesa: number
  bankTransfer: number
  card: number
  graduationRate: number // two-week only graduation rate
  collectionRate: number
  extraCharges: number
  badDebt: number
  courseBreakdown: Record<string, number>
  dailyAverages: Record<number, number> // day -> avg score
  finalGradeAverage?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getRomanNumeral = (num: number) => {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let r = ''
  for (let i = 0; i < vals.length; i++) while (num >= vals[i]) { r += syms[i]; num -= vals[i] }
  return r
}

const isShortCourse = (course: string | undefined | null) =>
  course !== 'Professional House Manager Training Program' && 
  course !== 'Professional Nanny Training Program'

const fmt = (n: number) => `KSh ${n.toLocaleString()}`

const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 100) : 0

// ─── Main Hook ────────────────────────────────────────────────────────────────

function useNicheReportsData(dateRange: DateRange) {
  const [loading, setLoading] = useState(true)
  const [volume, setVolume] = useState<VolumeMetrics | null>(null)
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null)
  const [finance, setFinance] = useState<FinanceMetrics | null>(null)
  const [courseRows, setCourseRows] = useState<CourseRow[]>([])
  const [cohortBars, setCohortBars] = useState<CohortBar[]>([])
  const [monthRows, setMonthRows] = useState<MonthRow[]>([])
  const [perCohortData, setPerCohortData] = useState<PerCohortData[]>([])
  const { showToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // ── 1. Cohorts ──────────────────────────────────────────────────────────
      const { data: cohorts } = await supabase
        .from('niche_cohorts')
        .select('*')
        .order('cohort_number')

      const cohortMap: Record<string, any> = {}
      cohorts?.forEach(c => { cohortMap[c.id] = c })

      // ── 2. Trainees ─────────────────────────────────────────────────────────
      let traineeQuery = supabase
        .from('niche_training')
        .select('*, niche_fees(*)')

      const { data: trainees } = await traineeQuery

      // Filter trainees by their enrollment date (date_started or created_at)
      const filteredTrainees = trainees?.filter(trainee => {
        if (!dateRange.from && !dateRange.to) return true
        const traineeDate = trainee.date_started || trainee.created_at?.split('T')[0]
        if (!traineeDate) return false
        if (dateRange.from && traineeDate < dateRange.from) return false
        if (dateRange.to && traineeDate > dateRange.to) return false
        return true
      }) || []

      // ── 3. Payments ─────────────────────────────────────────────────────────
      const { data: allPayments } = await supabase
        .from('niche_payments')
        .select('amount, payment_method, payment_date, fee_id')

      // Map fee_id → training_id for cohort filtering
      const { data: allFees } = await supabase
        .from('niche_fees')
        .select('id, training_id, course_fee, total_paid, sponsored_amount, extra_charges, is_bad_debt')

      const feeToTraining: Record<string, string> = {}
      const paymentTotals: Record<string, number> = {}
      allFees?.forEach(f => { feeToTraining[f.id] = f.training_id })

      // Calculate payment totals
      allPayments?.forEach(p => {
        paymentTotals[p.fee_id] = (paymentTotals[p.fee_id] || 0) + p.amount
      })

      const traineeIds = new Set(filteredTrainees?.map(t => t.id) || [])
      const filteredPayments = allPayments?.filter(p =>
        traineeIds.has(feeToTraining[p.fee_id])
      ) || []

      // ── 4. Blacklisted ──────────────────────────────────────────────────────
      const { count: blacklistedCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'BLACKLISTED')

      // ── 5. Niche Candidates (funnel) ────────────────────────────────────────
      let nicheQuery = supabase
        .from('niche_candidates')
        .select('id, status, inquiry_date, source, role, phone')
      if (dateRange.from) nicheQuery = nicheQuery.gte('inquiry_date', dateRange.from)
      if (dateRange.to) nicheQuery = nicheQuery.lte('inquiry_date', dateRange.to)
      const { data: nicheCandidates } = await nicheQuery

      // Also pull from main candidates table (synced)
      let mainQuery = supabase
        .from('candidates')
        .select('id, status, inquiry_date, source, role, phone')
        .not('status', 'is', null)
      if (dateRange.from) mainQuery = mainQuery.gte('inquiry_date', dateRange.from)
      if (dateRange.to) mainQuery = mainQuery.lte('inquiry_date', dateRange.to)
      const { data: mainCandidates } = await mainQuery

      // ── 6. Daily Progress Assessments ────────────────────────────────────────
      const { data: dailyAssessments } = await supabase
        .from('niche_progress_assessments')
        .select('trainee_id, assessment_day, question_1_score, question_2_score, question_3_score, question_4_score, question_5_score, total_score')
        .in('trainee_id', Array.from(traineeIds))

      // ── 7. Final Grades ──────────────────────────────────────────────────────
      const { data: finalGrades } = await supabase
        .from('trainee_grades')
        .select('trainee_id, final_score, tier, pillar1_score, pillar2_score, pillar3_score, pillar4_score')
        .in('trainee_id', Array.from(traineeIds))

      // ── COMPUTE VOLUME ──────────────────────────────────────────────────────
      const active = filteredTrainees?.filter(t => t.status === 'Active' || t.status === 'Active in Training').length || 0
      const twoWeekActive = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => !isShortCourse(c)) && (t.status === 'Active' || t.status === 'Active in Training')
      }).length || 0
      const shortActive = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => isShortCourse(c)) && (t.status === 'Active' || t.status === 'Active in Training')
      }).length || 0
      const graduated = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => !isShortCourse(c)) && (t.status === 'Graduated' || t.status === 'Completed')
      }).length || 0
      const completed = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => isShortCourse(c)) && (t.status === 'Graduated' || t.status === 'Completed')
      }).length || 0
      const expelled = filteredTrainees?.filter(t => t.status === 'Expelled').length || 0

      const twoWeekTrainees = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => !isShortCourse(c))
      }).length || 0

      const shortCourseTrainees = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => isShortCourse(c))
      }).length || 0

      setVolume({
        totalTrainees: filteredTrainees?.length || 0,
        graduated,
        twoWeekTrainees,
        shortCourseTrainees,
        completed,
        active,
        twoWeekActive,
        shortActive,
        expelled,
        blacklisted: blacklistedCount || 0
      })

      // ── COMPUTE FUNNEL ──────────────────────────────────────────────────────
      const allNiche = nicheCandidates || []
      const allMain = mainCandidates || []
      
      // Combine ALL: candidates + trainees, deduplicated
      const combinedIds = new Set<string>()
      const combinedPhone = new Set<string>()
      const combined: any[] = []
      
      // Add all candidates first
      ;[...allNiche, ...allMain].forEach(c => {
        if (c.id && !combinedIds.has(c.id)) { 
          combinedIds.add(c.id)
          combined.push(c) 
          if (c.phone) combinedPhone.add(String(c.phone).trim().toLowerCase())
        }
      })
      
      // Add trainees that aren't already in candidates list
      filteredTrainees?.forEach(t => {
        // Check if trainee is already in candidates (by ID if linked)
        if (t.candidate_id && combinedIds.has(t.candidate_id)) return
        // Check by phone if available
        if (t.phone) {
          const normalizedPhone = String(t.phone).trim().toLowerCase()
          if (combinedPhone.has(normalizedPhone)) return
        }
        // Add trainee as inquiry
        combined.push({
          id: t.id,
          status: t.status,
          phone: t.phone
        })
        combinedIds.add(t.id)
        if (t.phone) combinedPhone.add(String(t.phone).trim().toLowerCase())
      })

      const totalInquiries = combined.length

      const lostAll = combined.filter(c => c.status && c.status.toLowerCase().includes('lost'))
      const totalLost = lostAll.length

      const lostReasonMap: Record<string, number> = {}
      lostAll.forEach(c => {
        const reason = c.status.replace(/^Lost[,\-\s]*/i, '').trim() || 'Other'
        lostReasonMap[reason] = (lostReasonMap[reason] || 0) + 1
      })
      const lostReasons = Object.entries(lostReasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)

      // Compute source breakdown
      const sourceMap: Record<string, number> = {}
      ;[...allNiche, ...allMain].forEach(c => {
        const source = c.source || 'Unknown'
        sourceMap[source] = (sourceMap[source] || 0) + 1
      })
      const sourceBreakdown = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // top 5 sources

      // Compute role breakdown
      const roleMap: Record<string, number> = {}
      ;[...allNiche, ...allMain].forEach(c => {
        const role = c.role || 'Unknown'
        roleMap[role] = (roleMap[role] || 0) + 1
      })
      const roleBreakdown = Object.entries(roleMap)
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // top 5 roles

      const funnelTwoWeekTrainees = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => !isShortCourse(c))
      }).length || 0
      const funnelTwoWeekGraduated = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => !isShortCourse(c)) && t.status === 'Graduated'
      }).length || 0
      const funnelShortCourseTrainees = filteredTrainees?.filter(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        return courses.some((c: string) => isShortCourse(c))
      }).length || 0
      const joinRate = pct(filteredTrainees?.length || 0, totalInquiries)
      const graduationRate = pct(funnelTwoWeekGraduated, funnelTwoWeekTrainees)

      setFunnel({
        totalInquiries,
        joinedTraining: filteredTrainees?.length || 0,
        joinRate,
        graduationRate,
        totalLost,
        lostReasons,
        sourceBreakdown,
        roleBreakdown,
        twoWeekTrainees: funnelTwoWeekTrainees,
        shortCourseTrainees: funnelShortCourseTrainees,
      })

      // ── COMPUTE FINANCE ─────────────────────────────────────────────────────
      let totalFees = 0, totalPaid = 0, totalSponsored = 0, totalExtraCharges = 0, totalBadDebt = 0
      let cash = 0, mpesa = 0, bankTransfer = 0, card = 0

      filteredTrainees?.forEach(t => {
        const fees = Array.isArray(t.niche_fees) ? t.niche_fees : (t.niche_fees ? [t.niche_fees] : [])
        // For 2-week trainees, take first fee; for short courses, take all (but avoid duplicates)
        const uniqueFees = fees.filter((fee, index, self) => 
          index === self.findIndex(f => f.id === fee.id)
        )
        
        uniqueFees.forEach(fee => {
          const actualPayments = paymentTotals[fee.id] || 0
          const sponsoredAmt = fee.sponsored_amount || 0
          const extraCharges = fee.extra_charges || 0
          const isBadDebt = fee.is_bad_debt || false
          
          totalFees += (fee.course_fee || 0) + extraCharges
          totalPaid += actualPayments
          totalSponsored += sponsoredAmt
          totalExtraCharges += extraCharges
          
          if (isBadDebt) {
            const badDebtAmount = Math.max(0, (fee.course_fee || 0) + extraCharges - sponsoredAmt - actualPayments)
            totalBadDebt += badDebtAmount
          }
        })
      })

      filteredPayments.forEach(p => {
        const amt = p.amount || 0
        switch (p.payment_method) {
          case 'Cash': cash += amt; break
          case 'M-Pesa': mpesa += amt; break
          case 'Bank Transfer': bankTransfer += amt; break
          case 'Card': card += amt; break
        }
      })

      const totalCollected = totalPaid + totalSponsored
      const totalOutstanding = Math.max(0, totalFees - totalCollected - totalBadDebt)
      const collectionRate = pct(totalPaid, totalFees - totalBadDebt)

      setFinance({
        totalRevenue: totalPaid,
        cash,
        mpesa,
        bankTransfer,
        card,
        sponsored: totalSponsored,
        outstanding: totalOutstanding,
        totalFees,
        collectionRate,
        extraCharges: totalExtraCharges,
        badDebt: totalBadDebt
      })

      // ── COMPUTE COURSE ROWS ─────────────────────────────────────────────────
      const courseMap: Record<string, CourseRow> = {}
      filteredTrainees?.forEach(t => {
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        const fee = t.niche_fees?.[0]
        courses.forEach((c: string) => {
          if (!courseMap[c]) courseMap[c] = { name: c, enrolled: 0, graduated: 0, expelled: 0, active: 0, pending: 0, outstandingFees: 0, totalFees: 0, collected: 0 }
          courseMap[c].enrolled++
          if (t.status === 'Graduated') courseMap[c].graduated++
          else if (t.status === 'Completed') courseMap[c].graduated++
          else if (t.status === 'Expelled') courseMap[c].expelled++
          else if (t.status === 'Active' || t.status === 'Active in Training') courseMap[c].active++
          else courseMap[c].pending++
          if (fee) {
            courseMap[c].totalFees += fee.course_fee || 0
            courseMap[c].collected += fee.total_paid || 0
            courseMap[c].outstandingFees += Math.max(0, (fee.course_fee || 0) - (fee.total_paid || 0) - (fee.sponsored_amount || 0))
          }
        })
      })
      setCourseRows(Object.values(courseMap).sort((a, b) => b.enrolled - a.enrolled))

      // ── COMPUTE COHORT BARS ─────────────────────────────────────────────────
      const cohortBarMap: Record<string, CohortBar> = {}
      cohorts?.filter(c => c.status !== 'upcoming').forEach(c => {
        cohortBarMap[c.id] = { cohort_number: c.cohort_number, twoWeek: 0, shortCourse: 0, revenue: 0, graduated: 0 }
      })

      filteredTrainees?.forEach(t => {
        if (!t.cohort_id || !cohortBarMap[t.cohort_id]) return
        const courses = t.enrolled_courses || [t.course].filter(Boolean)
        const hasShort = courses.some((c: string) => isShortCourse(c))
        const hasLong = courses.some((c: string) => !isShortCourse(c))
        if (hasShort) cohortBarMap[t.cohort_id].shortCourse++
        if (hasLong) cohortBarMap[t.cohort_id].twoWeek++
        if (t.status === 'Graduated') cohortBarMap[t.cohort_id].graduated++
        const fee = t.niche_fees?.[0]
        if (fee) cohortBarMap[t.cohort_id].revenue += fee.total_paid || 0
      })
      setCohortBars(Object.values(cohortBarMap).sort((a, b) => a.cohort_number - b.cohort_number))

      // ── COMPUTE MONTH ROWS ──────────────────────────────────────────────────
      const monthMap: Record<string, MonthRow> = {}
      filteredTrainees?.forEach(t => {
        const d = t.date_started || t.created_at
        if (!d) return
        const key = d.substring(0, 7) // YYYY-MM
        if (!monthMap[key]) monthMap[key] = { month: key, enrolled: 0, graduated: 0, revenue: 0, lost: 0, graduationRate: 0, shortEnrolled: 0, twoWeekEnrolled: 0 }
        monthMap[key].enrolled++
        const tCourses = t.enrolled_courses || [t.course].filter(Boolean)
        if (tCourses.some((c: string) => isShortCourse(c))) monthMap[key].shortEnrolled++
        if (tCourses.some((c: string) => !isShortCourse(c))) monthMap[key].twoWeekEnrolled++
        if (t.status === 'Graduated') monthMap[key].graduated++
        if (t.status === 'Expelled') monthMap[key].lost++
        const fee = t.niche_fees?.[0]
        if (fee) monthMap[key].revenue += fee.total_paid || 0
      })
      const months = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
      months.forEach(m => { m.graduationRate = pct(m.graduated, m.enrolled) })
      setMonthRows(months)

      // ── COMPUTE PER COHORT ──────────────────────────────────────────────────
      const perCohort: PerCohortData[] = []
      cohorts?.filter(c => c.status !== 'upcoming').forEach(cohort => {
        const ct = filteredTrainees?.filter(t => t.cohort_id === cohort.id) || []
        const cp = filteredPayments.filter(p => {
          const tid = feeToTraining[p.fee_id]
          return ct.some(t => t.id === tid)
        })

        let tf = 0, tp = 0, ts = 0, cc = 0, cm = 0, cb = 0, ccard = 0, cExtra = 0, cBadDebt = 0
        const cBreakdown: Record<string, number> = {}
        const cohortTraineeIds = ct.map(t => t.id)
        
        // Calculate daily averages
        const dailySums: Record<number, { sum: number; count: number }> = {}
        const cohortAssessments = dailyAssessments?.filter(a => cohortTraineeIds.includes(a.trainee_id)) || []
        cohortAssessments.forEach(assessment => {
          const day = assessment.assessment_day
          if (!dailySums[day]) {
            dailySums[day] = { sum: 0, count: 0 }
          }
          // Calculate average for this assessment
          const scores = [
            assessment.question_1_score,
            assessment.question_2_score,
            assessment.question_3_score,
            assessment.question_4_score,
            assessment.question_5_score
          ].filter(s => s !== null) as number[]
          if (scores.length > 0) {
            const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
            dailySums[day].sum += avg
            dailySums[day].count++
          }
        })
        const dailyAverages: Record<number, number> = {}
        Object.keys(dailySums).forEach(dayStr => {
          const day = Number(dayStr)
          if (dailySums[day].count > 0) {
            dailyAverages[day] = dailySums[day].sum / dailySums[day].count
          }
        })
        
        // Calculate final grade average
        const cohortFinalGrades = finalGrades?.filter(g => cohortTraineeIds.includes(g.trainee_id)) || []
        let finalGradeSum = 0
        let finalGradeCount = 0
        cohortFinalGrades.forEach(g => {
          if (g.final_score !== undefined && g.final_score !== null) {
            finalGradeSum += g.final_score
            finalGradeCount++
          }
        })
        const finalGradeAverage = finalGradeCount > 0 ? finalGradeSum / finalGradeCount : undefined

        ct.forEach(t => {
          const fees = Array.isArray(t.niche_fees) ? t.niche_fees : (t.niche_fees ? [t.niche_fees] : [])
          const uniqueFees = fees.filter((fee, index, self) => 
            index === self.findIndex(f => f.id === fee.id)
          )
          
          uniqueFees.forEach(fee => {
            const actualPayments = paymentTotals[fee.id] || 0
            const sponsoredAmt = fee.sponsored_amount || 0
            const extraCharges = fee.extra_charges || 0
            const isBadDebt = fee.is_bad_debt || false
            
            tf += (fee.course_fee || 0) + extraCharges
            tp += actualPayments
            ts += sponsoredAmt
            cExtra += extraCharges
            
            if (isBadDebt) {
              const badDebtAmount = Math.max(0, (fee.course_fee || 0) + extraCharges - sponsoredAmt - actualPayments)
              cBadDebt += badDebtAmount
            }
          })
          
          const courses = t.enrolled_courses || [t.course].filter(Boolean)
          courses.forEach((c: string) => { cBreakdown[c] = (cBreakdown[c] || 0) + 1 })
        })

        cp.forEach(p => {
          const amt = p.amount || 0
          switch (p.payment_method) {
            case 'Cash': cc += amt; break
            case 'M-Pesa': cm += amt; break
            case 'Bank Transfer': cb += amt; break
            case 'Card': ccard += amt; break
          }
        })

        const twoWeekTrainees = ct.filter(t => { 
          const cs = t.enrolled_courses || [t.course].filter(Boolean); 
          return cs.some((c: string) => !isShortCourse(c)) 
        })
        const twoWeekGraduated = twoWeekTrainees.filter(t => t.status === 'Graduated').length
        
        const totalCollected = tp + ts
        const outstanding = Math.max(0, tf - totalCollected - cBadDebt)
        const collectionRate = pct(tp, tf - cBadDebt)
        
        perCohort.push({
          cohort_number: cohort.cohort_number,
          cohort_id: cohort.id,
          start_date: cohort.start_date,
          end_date: cohort.end_date,
          status: cohort.status,
          totalTrainees: ct.length,
          graduated: twoWeekGraduated,
          expelled: ct.filter(t => t.status === 'Expelled').length,
          active: ct.filter(t => t.status === 'Active' || t.status === 'Active in Training').length,
          twoWeek: twoWeekTrainees.length,
          shortCourse: ct.filter(t => { const cs = t.enrolled_courses || [t.course].filter(Boolean); return cs.some((c: string) => isShortCourse(c)) }).length,
          totalFees: tf,
          collected: tp,
          sponsored: ts,
          outstanding: outstanding,
          cash: cc,
          mpesa: cm,
          bankTransfer: cb,
          card: ccard,
          graduationRate: pct(twoWeekGraduated, twoWeekTrainees.length),
          collectionRate: collectionRate,
          extraCharges: cExtra,
          badDebt: cBadDebt,
          courseBreakdown: cBreakdown,
          dailyAverages,
          finalGradeAverage
        })
      })
      setPerCohortData(perCohort.sort((a, b) => a.cohort_number - b.cohort_number))

    } catch (err) {
      console.error(err)
      showToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to])

  useEffect(() => { load() }, [load])

  return { loading, volume, funnel, finance, courseRows, cohortBars, monthRows, perCohortData, reload: load }
}

// ─── Export hook + helpers for use in UI parts ────────────────────────────────
export { useNicheReportsData, fmt, pct, isShortCourse }
export type { DateRange, VolumeMetrics, FunnelMetrics, FinanceMetrics, CourseRow, CohortBar, MonthRow, PerCohortData }

// ─── Bar Chart Component ──────────────────────────────────────────────────────

function BarChart({ data, keys, colors, height = 120 }: {
  data: { label: string; values: number[] }[]
  keys: string[]
  colors: string[]
  height?: number
}) {
  const max = Math.max(...data.flatMap(d => d.values), 1)
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 pb-6 relative" style={{ minWidth: data.length * 44 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[36px]">
            <div className="flex items-end gap-0.5 w-full justify-center" style={{ height }}>
              {d.values.map((v, vi) => (
                <div key={vi} className="flex flex-col items-center justify-end w-full">
                  <span className="text-[9px] text-gray-500 mb-0.5">{v > 0 ? v : ''}</span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${Math.max((v / max) * height, v > 0 ? 4 : 0)}px`,
                      backgroundColor: colors[vi]
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 text-center leading-tight">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-1">
        {keys.map((k, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
            <span className="text-xs text-gray-500">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ label, value, sub, valueClass = 'text-gray-900' }: {
  label: string; value: string | number; sub?: React.ReactNode; valueClass?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-300 pb-2 mb-4">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">{title}</h2>
    </div>
  )
}

// ─── Overall Tab ──────────────────────────────────────────────────────────────

export function OverallTab({ volume, funnel, finance, courseRows, cohortBars, monthRows, perCohortData }: {
  volume: VolumeMetrics;
  funnel: FunnelMetrics;
  finance: FinanceMetrics;
  courseRows: CourseRow[];
  cohortBars: CohortBar[];
  monthRows: MonthRow[];
  perCohortData: PerCohortData[];
}) {
  const allCohortIds = perCohortData.map(c => c.cohort_id);
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(allCohortIds);
  const [selectedCohortForDetail, setSelectedCohortForDetail] = useState<string | null>(null);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isDetailDropdownOpen, setIsDetailDropdownOpen] = useState(false);
  const multiSelectRef = useRef<HTMLDivElement>(null);
  const detailSelectRef = useRef<HTMLDivElement>(null);
  
  const toggleCohort = (cohortId: string) => {
    setSelectedCohortIds(prev => 
      prev.includes(cohortId) 
        ? prev.filter(id => id !== cohortId) 
        : [...prev, cohortId]
    );
  };

  // Update selected cohorts when perCohortData changes
  useEffect(() => {
    const newAllCohortIds = perCohortData.map(c => c.cohort_id);
    setSelectedCohortIds(newAllCohortIds);
  }, [perCohortData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (multiSelectRef.current && !multiSelectRef.current.contains(e.target as Node)) {
        setIsMultiSelectOpen(false);
      }
      if (detailSelectRef.current && !detailSelectRef.current.contains(e.target as Node)) {
        setIsDetailDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate overall daily averages across all selected cohorts or all cohorts
  const calculateOverallDailyAverages = () => {
    const cohortsToUse = selectedCohortIds.length > 0 
      ? perCohortData.filter(c => selectedCohortIds.includes(c.cohort_id))
      : perCohortData;
      
    const dailySums: Record<number, { sum: number; count: number }> = {};
    cohortsToUse.forEach(cohort => {
      Object.entries(cohort.dailyAverages).forEach(([day, avg]) => {
        const d = Number(day);
        if (!dailySums[d]) dailySums[d] = { sum: 0, count: 0 };
        dailySums[d].sum += avg;
        dailySums[d].count += 1;
      });
    });
    
    const overallAverages: Record<number, number> = {};
    Object.entries(dailySums).forEach(([day, data]) => {
      overallAverages[Number(day)] = data.sum / data.count;
    });
    return overallAverages;
  };

  const overallDailyAverages = calculateOverallDailyAverages();

  // Calculate overall final grade average
  const calculateOverallFinalGradeAverage = () => {
    const cohortsToUse = selectedCohortIds.length > 0 
      ? perCohortData.filter(c => selectedCohortIds.includes(c.cohort_id))
      : perCohortData;
      
    let sum = 0;
    let count = 0;
    cohortsToUse.forEach(cohort => {
      if (cohort.finalGradeAverage !== undefined) {
        sum += cohort.finalGradeAverage;
        count += 1;
      }
    });
    
    return count > 0 ? sum / count : undefined;
  };
  const overallFinalGradeAverage = calculateOverallFinalGradeAverage();

  return (
    <div id="niche-report-overall" className="space-y-8">

      {/* ── ROW 1: VOLUME ── */}
      <section>
        <SectionHeader title="Volume" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Card 
            label="Total Trainees" 
            value={volume.totalTrainees} 
            sub={
              <div className="space-y-0.5">
                <div>{volume.twoWeekTrainees} 2-week</div>
                <div>{volume.shortCourseTrainees} short</div>
              </div>
            }
          />
          <Card label="Active" value={volume.active} valueClass="text-blue-700"
            sub={
              <div className="space-y-0.5">
                <div>{volume.twoWeekActive} 2-week</div>
                <div>{volume.shortActive} short</div>
              </div>
            } />
          <Card label="Graduated" value={volume.graduated} valueClass="text-emerald-700" />
          <Card label="Completed" value={volume.completed} valueClass="text-purple-700" />
          <Card label="2-Week Trainees" value={volume.twoWeekTrainees} />
          <Card label="Short Courses" value={volume.shortCourseTrainees} />
          <Card label="Expelled" value={volume.expelled} valueClass="text-red-600" />
          <Card label="Blacklisted" value={volume.blacklisted} valueClass="text-gray-700" />
        </div>
      </section>

      {/* ── ROW 2: FUNNEL ── */}
      <section>
        <SectionHeader title="Funnel" />
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <Card label="Total Inquiries" value={funnel.totalInquiries} />
          <Card label="Joined Training" value={funnel.joinedTraining}
            sub={
              <div className="space-y-0.5">
                <div>{funnel.joinRate}% join rate</div>
                <div>{funnel.twoWeekTrainees} 2-week</div>
                <div>{funnel.shortCourseTrainees} short</div>
              </div>
            } valueClass="text-blue-700" />
          <Card label="Graduation Rate" value={`${funnel.graduationRate}%`}
            sub={`${funnel.joinedTraining} enrolled`} valueClass="text-emerald-700" />
          <Card label="Total Lost" value={funnel.totalLost}
            sub={`${pct(funnel.totalLost, funnel.totalInquiries)}% of inquiries`} valueClass="text-red-600" />
          {/* Lost top 3 reasons */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Lost Reasons</div>
            <div className="space-y-1.5">
              {funnel.lostReasons.length === 0 && <div className="text-xs text-gray-400">No data</div>}
              {funnel.lostReasons.map((r, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-gray-700 truncate flex-1 mr-1">{r.reason}</span>
                  <span className="text-xs font-bold text-gray-900">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Sources */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Sources</div>
            <div className="space-y-1.5">
              {funnel.sourceBreakdown.length === 0 && <div className="text-xs text-gray-400">No data</div>}
              {funnel.sourceBreakdown.map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-gray-700 truncate flex-1 mr-1">{s.source}</span>
                  <span className="text-xs font-bold text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Roles */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Roles</div>
            <div className="space-y-1.5">
              {funnel.roleBreakdown.length === 0 && <div className="text-xs text-gray-400">No data</div>}
              {funnel.roleBreakdown.map((r, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-gray-700 truncate flex-1 mr-1">{r.role}</span>
                  <span className="text-xs font-bold text-gray-900">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROW 3: FINANCE ── */}
      <section>
        <SectionHeader title="Finance" />
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-3">
          <Card label="Total Revenue" value={fmt(finance.totalRevenue)} valueClass="text-green-700"
            sub={`${finance.collectionRate}% collection rate`} />
          <Card label="Sponsored" value={fmt(finance.sponsored)} valueClass="text-purple-700" />
          <Card label="Outstanding" value={fmt(finance.outstanding)} valueClass="text-orange-600"
            sub={`of KSh ${finance.totalFees.toLocaleString()} total fees`} />
          <Card label="Extra Charges" value={fmt(finance.extraCharges)} valueClass="text-amber-600" />
          <Card label="Bad Debt" value={fmt(finance.badDebt)} valueClass="text-gray-600" />
        </div>
      </section>

      {/* ── TRAINING PROGRESS ── */}
      <section>
        <SectionHeader title="Training Progress" />
        
        {/* Cohort Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Select Cohorts
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative" ref={multiSelectRef}>
              <button
                onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedCohortIds.length === 0 
                    ? "Select cohorts..." 
                    : selectedCohortIds.length === perCohortData.length 
                      ? "All cohorts" 
                      : `${selectedCohortIds.length} cohort${selectedCohortIds.length === 1 ? '' : 's'} selected`}
                </span>
                <span className="text-gray-400">▼</span>
              </button>
              
              {isMultiSelectOpen && (
                <div className="absolute z-20 w-full md:w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  <div 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCohortIds(
                        selectedCohortIds.length === perCohortData.length ? [] : allCohortIds
                      );
                    }}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        checked={selectedCohortIds.length === perCohortData.length}
                        readOnly
                      />
                      <span className="text-sm">Select All</span>
                    </label>
                  </div>
                  {perCohortData.map(cohort => (
                    <div 
                      key={cohort.cohort_id} 
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCohort(cohort.cohort_id);
                      }}
                    >
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="mr-2"
                          checked={selectedCohortIds.includes(cohort.cohort_id)}
                          readOnly
                        />
                        <span className="text-sm">Cohort {getRomanNumeral(cohort.cohort_number)} — {formatDateWithOrdinal(cohort.start_date)} to {formatDateWithOrdinal(cohort.end_date)}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overall Training Progress */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Overall Progress
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[1, 3, 5, 10].map(day => {
              const avg = overallDailyAverages[day];
              return (
                <div key={day} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Day {day}</div>
                  <div className="text-lg font-bold text-gray-900">
                    {avg ? avg.toFixed(1) : '—'}
                  </div>
                </div>
              );
            })}
            {overallFinalGradeAverage !== undefined && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">Final Grade</div>
                <div className="text-lg font-bold text-gray-900">
                  {overallFinalGradeAverage.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cohort Selection for Detail View */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            View Cohort Detail
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative" ref={detailSelectRef}>
              <button
                onClick={() => setIsDetailDropdownOpen(!isDetailDropdownOpen)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedCohortForDetail 
                    ? `Cohort ${getRomanNumeral(perCohortData.find(c => c.cohort_id === selectedCohortForDetail)?.cohort_number || 0)}`
                    : "None"
                  }
                </span>
                <span className="text-gray-400">▼</span>
              </button>
              
              {isDetailDropdownOpen && (
                <div className="absolute z-20 w-full md:w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  <div 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCohortForDetail(null);
                      setIsDetailDropdownOpen(false);
                    }}
                  >
                    <span className="text-sm">None</span>
                  </div>
                  {perCohortData.map(cohort => (
                    <div 
                      key={cohort.cohort_id} 
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCohortForDetail(cohort.cohort_id);
                        setIsDetailDropdownOpen(false);
                      }}
                    >
                      <span className="text-sm">Cohort {getRomanNumeral(cohort.cohort_number)} — {formatDateWithOrdinal(cohort.start_date)} to {formatDateWithOrdinal(cohort.end_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Cohort Detail View */}
        {selectedCohortForDetail && (
          (() => {
            const cohort = perCohortData.find(c => c.cohort_id === selectedCohortForDetail);
            if (!cohort) return null;
            const hasData = Object.keys(cohort.dailyAverages).length > 0 || cohort.finalGradeAverage !== undefined;
            if (!hasData) return null;
            
            return (
              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
                  Cohort {getRomanNumeral(cohort.cohort_number)} Detail
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {[1, 3, 5, 10].map(day => {
                    const avg = cohort.dailyAverages[day];
                    return (
                      <div key={day} className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-500">Day {day}</div>
                        <div className="text-lg font-bold text-gray-900">
                          {avg ? avg.toFixed(1) : '—'}
                        </div>
                      </div>
                    );
                  })}
                  {cohort.finalGradeAverage !== undefined && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Final Grade</div>
                      <div className="text-lg font-bold text-gray-900">
                        {cohort.finalGradeAverage.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                {cohort.finalGradeAverage !== undefined && (
                  <div>
                    <div className={`inline-block text-xs px-3 py-1 rounded-full font-semibold ${
                      cohort.finalGradeAverage >= 90 ? 'bg-purple-100 text-purple-700' :
                      cohort.finalGradeAverage >= 80 ? 'bg-blue-100 text-blue-700' :
                      cohort.finalGradeAverage >= 70 ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {cohort.finalGradeAverage >= 90 ? 'Master' :
                       cohort.finalGradeAverage >= 80 ? 'Distinguished' :
                       cohort.finalGradeAverage >= 70 ? 'Excellent' : 'Needs Improvement'}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </section>

      {/* ── COHORT COMPARISON ── */}
      <section>
        <SectionHeader title="Cohort Comparison" />
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Compare Cohorts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Cohort</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Total Trainees</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">2-Week Trainees</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Graduated (2-Week)</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Graduation Rate</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Expelled</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Final Grade</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Change (Day 1 → Day 10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perCohortData.map(cohort => {
                  const day1 = cohort.dailyAverages[1];
                  const day10 = cohort.dailyAverages[10];
                  const change = day1 !== undefined && day10 !== undefined ? (day10 - day1).toFixed(1) : '—';
                  
                  return (
                    <tr key={cohort.cohort_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">
                        Cohort {getRomanNumeral(cohort.cohort_number)}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-900 font-bold">
                        {cohort.totalTrainees}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-900 font-medium">
                        {cohort.twoWeek}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-700 font-semibold">
                        {cohort.twoWeekGraduated}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        <span className={cohort.graduationRate >= 70 ? 'text-emerald-700' : cohort.graduationRate >= 40 ? 'text-yellow-600' : 'text-gray-500'}>
                          {cohort.graduationRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-red-600 font-semibold">
                        {cohort.expelled}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-900 font-bold">
                        {cohort.finalGradeAverage !== undefined ? `${cohort.finalGradeAverage.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        <span className={
                          Number(change) > 0 ? 'text-green-700' : 
                          Number(change) < 0 ? 'text-red-600' : 
                          'text-gray-500'
                        }>
                          {change !== '—' ? (Number(change) > 0 ? `+${change}` : change) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── COURSE ENROLLMENT TABLE ── */}
      <section>
        <SectionHeader title="Course Enrollment" />
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Course</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Enrolled</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Graduated</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Active</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Expelled</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Grad Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Collected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courseRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px]">
                    <div className="truncate" title={row.name}>{row.name}</div>
                    <div className="text-xs text-gray-400">{isShortCourse(row.name) ? 'Short Course' : '2-Week'}</div>
                  </td>
                  <td className="text-center px-3 py-3 font-bold text-gray-900">{row.enrolled}</td>
                  <td className="text-center px-3 py-3 text-emerald-700 font-semibold">{row.graduated}</td>
                  <td className="text-center px-3 py-3 text-blue-700">{row.active}</td>
                  <td className="text-center px-3 py-3 text-red-600">{row.expelled}</td>
                  <td className="text-center px-3 py-3 font-semibold">
                    <span className={pct(row.graduated, row.enrolled) >= 70 ? 'text-emerald-700' : pct(row.graduated, row.enrolled) >= 40 ? 'text-yellow-600' : 'text-gray-500'}>
                      {pct(row.graduated, row.enrolled)}%
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-green-700 font-semibold">KSh {row.collected.toLocaleString()}</td>
                  <td className="text-right px-4 py-3 text-orange-600">{row.outstandingFees > 0 ? `KSh ${row.outstandingFees.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
              {courseRows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No data for selected period</td></tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-gray-700">TOTAL</td>
                <td className="text-center px-3 py-3 text-xs font-bold">{courseRows.reduce((s, r) => s + r.enrolled, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-emerald-700">{courseRows.reduce((s, r) => s + r.graduated, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-blue-700">{courseRows.reduce((s, r) => s + r.active, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-red-600">{courseRows.reduce((s, r) => s + r.expelled, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold">
                  {pct(courseRows.reduce((s, r) => s + r.graduated, 0), courseRows.reduce((s, r) => s + r.enrolled, 0))}%
                </td>
                <td className="text-right px-4 py-3 text-xs font-bold text-green-700">KSh {courseRows.reduce((s, r) => s + r.collected, 0).toLocaleString()}</td>
                <td className="text-right px-4 py-3 text-xs font-bold text-orange-600">KSh {courseRows.reduce((s, r) => s + r.outstandingFees, 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── FINANCIAL DETAIL ── */}
      <section>
        <SectionHeader title="Financial Detail" />
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Per-cohort financials table */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">Financials per Cohort</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-gray-600 font-semibold">Cohort</th>
                    <th className="text-center px-3 py-2 text-xs text-gray-600 font-semibold">Trainees</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Total Fees</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Collected</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Sponsored</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Outstanding</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Extra Charges</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-600 font-semibold">Bad Debt</th>
                    <th className="text-center px-3 py-2 text-xs text-gray-600 font-semibold">Collection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perCohortData.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">Cohort {getRomanNumeral(c.cohort_number)}</td>
                      <td className="px-3 py-2 text-center text-gray-900 font-bold">{c.totalTrainees}</td>
                      <td className="px-3 py-2 text-right text-gray-900">KSh {c.totalFees.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">KSh {c.collected.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-purple-700">KSh {c.sponsored.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-orange-600">KSh {c.outstanding.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-amber-600">KSh {c.extraCharges.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-600">KSh {c.badDebt.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={c.collectionRate >= 80 ? 'text-green-700' : c.collectionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          {c.collectionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── BAR CHARTS ── */}
      <section>
        <SectionHeader title="Trainees per Cohort" />
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">Trainees per Cohort (2-Week vs Short Course)</div>
            <BarChart
              data={cohortBars.map(c => ({ label: `C${c.cohort_number}`, values: [c.twoWeek, c.shortCourse] }))}
              keys={['2-Week', 'Short Course']}
              colors={['#4f46e5', '#0891b2']}
            />
          </div>
        </div>
      </section>

      {/* ── MONTH TO MONTH ── */}
      <section>
        <SectionHeader title="Month-to-Month Progress" />
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">Enrollments & Graduations by Month</div>
          <BarChart
            data={monthRows.map(m => ({ label: m.month.substring(5), values: [m.enrolled, m.graduated] }))}
            keys={['Enrolled', 'Graduated']}
            colors={['#6366f1', '#10b981']}
            height={100}
          />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Month</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Enrolled</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Graduated</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Expelled</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Grad Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthRows.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {new Date(m.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="text-center px-3 py-3 font-bold text-gray-900">{m.enrolled}</td>
                  <td className="text-center px-3 py-3 text-emerald-700 font-semibold">{m.graduated}</td>
                  <td className="text-center px-3 py-3 text-red-600">{m.lost}</td>
                  <td className="text-center px-3 py-3">
                    <span className={`font-semibold ${m.graduationRate >= 70 ? 'text-emerald-700' : m.graduationRate >= 40 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {m.graduationRate}%
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-green-700 font-semibold">KSh {m.revenue.toLocaleString()}</td>
                </tr>
              ))}
              {monthRows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SHORT COURSES + FINANCIALS MONTH OVER MONTH */}
      <section>
        <SectionHeader title="Short Courses: Month over Month" />
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Month</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Short Course</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">2-Week</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">Short %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Grad Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthRows.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {new Date(m.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="text-center px-3 py-3 font-bold text-cyan-700">{m.shortEnrolled}</td>
                  <td className="text-center px-3 py-3 font-bold text-indigo-700">{m.twoWeekEnrolled}</td>
                  <td className="text-center px-3 py-3 font-bold text-gray-900">{m.enrolled}</td>
                  <td className="text-center px-3 py-3 text-gray-600">{pct(m.shortEnrolled, m.enrolled)}%</td>
                  <td className="text-right px-4 py-3 font-semibold text-green-700">KSh {m.revenue.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`font-semibold ${m.graduationRate >= 70 ? 'text-emerald-700' : m.graduationRate >= 40 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {m.graduationRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {monthRows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No data for selected period</td></tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-gray-700">TOTAL</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-cyan-700">{monthRows.reduce((s, m) => s + m.shortEnrolled, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-indigo-700">{monthRows.reduce((s, m) => s + m.twoWeekEnrolled, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-gray-900">{monthRows.reduce((s, m) => s + m.enrolled, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-bold text-gray-600">{pct(monthRows.reduce((s, m) => s + m.shortEnrolled, 0), monthRows.reduce((s, m) => s + m.enrolled, 0))}%</td>
                <td className="text-right px-4 py-3 text-xs font-bold text-green-700">KSh {monthRows.reduce((s, m) => s + m.revenue, 0).toLocaleString()}</td>
                <td className="text-right px-4 py-3 text-xs font-bold">{pct(monthRows.reduce((s, m) => s + m.graduated, 0), monthRows.reduce((s, m) => s + m.enrolled, 0))}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}

// ─── Per Cohort Tab ───────────────────────────────────────────────────────────

function PerCohortTab({ perCohortData }: { perCohortData: PerCohortData[] }) {
  const [selected, setSelected] = useState<PerCohortData | null>(null)

  return (
    <div className="flex gap-6">
      {/* Cohort list */}
      <div className="w-56 flex-shrink-0 space-y-1.5 overflow-y-auto max-h-[80vh] pr-1">
        {perCohortData.map(c => (
          <button
            key={c.cohort_id}
            onClick={() => setSelected(c)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selected?.cohort_id === c.cohort_id
                ? 'border-nestalk-primary bg-nestalk-primary/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-gray-900 text-sm">Cohort {getRomanNumeral(c.cohort_number)}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                c.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                c.status === 'graduated' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                'bg-gray-100 text-gray-600 border-gray-200'
              }`}>{c.status}</span>
            </div>
            <div className="text-xs text-gray-500">{c.totalTrainees} trainees</div>
            <div className="text-xs text-gray-400">
              {new Date(c.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </button>
        ))}
        {perCohortData.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">No cohorts in range</div>
        )}
      </div>

      {/* Cohort detail */}
      <div className="flex-1">
        {!selected ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Select a cohort to view its report
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cohort {getRomanNumeral(selected.cohort_number)}</h2>
              <p className="text-sm text-gray-500">
                {new Date(selected.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} –{' '}
                {new Date(selected.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Volume cards */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <Card label="Total Trainees" value={selected.totalTrainees} />
              <Card label="Graduated" value={selected.graduated} valueClass="text-emerald-700"
                sub={`${selected.graduationRate}% rate`} />
              <Card label="Active" value={selected.active} valueClass="text-blue-700" />
              <Card label="Expelled" value={selected.expelled} valueClass="text-red-600" />
              <Card label="2-Week" value={selected.twoWeek} />
              <Card label="Short Course" value={selected.shortCourse} />
            </div>

            {/* Finance cards */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <Card label="Total Fees" value={fmt(selected.totalFees)} />
              <Card label="Collected" value={fmt(selected.collected)} valueClass="text-green-700"
                sub={`${selected.collectionRate}% rate`} />
              <Card label="Sponsored" value={fmt(selected.sponsored)} valueClass="text-purple-700" />
              <Card label="Outstanding" value={fmt(selected.outstanding)} valueClass="text-orange-600" />
              <Card label="Cash" value={fmt(selected.cash)} />
            </div>
            {(selected.mpesa > 0 || selected.bankTransfer > 0 || selected.card > 0) && (
              <div className="grid grid-cols-3 gap-3">
                {selected.mpesa > 0 && <Card label="M-Pesa" value={fmt(selected.mpesa)} />}
                {selected.bankTransfer > 0 && <Card label="Bank Transfer" value={fmt(selected.bankTransfer)} />}
                {selected.card > 0 && <Card label="Card" value={fmt(selected.card)} />}
              </div>
            )}

            {/* Course breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Course Distribution</div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500">Course</th>
                  <th className="text-right py-2 text-xs text-gray-500">Trainees</th>
                  <th className="text-right py-2 text-xs text-gray-500">Type</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(selected.courseBreakdown).sort(([,a],[,b]) => b-a).map(([course, count], i) => (
                    <tr key={i}>
                      <td className="py-2 text-gray-800">{course}</td>
                      <td className="py-2 text-right font-bold text-gray-900">{count}</td>
                      <td className="py-2 text-right text-xs text-gray-400">{isShortCourse(course) ? 'Short' : '2-Week'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Financial Performance</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Collection Rate</div>
                  <div className={`text-2xl font-bold ${selected.collectionRate >= 80 ? 'text-emerald-700' : selected.collectionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {selected.collectionRate}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Graduation Rate</div>
                  <div className={`text-2xl font-bold ${selected.graduationRate >= 80 ? 'text-emerald-700' : selected.graduationRate >= 50 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {selected.graduationRate}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Avg Fee / Trainee</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selected.totalTrainees > 0 ? `KSh ${Math.round(selected.totalFees / selected.totalTrainees).toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Month Selector ───────────────────────────────────────────────────────────

type PeriodOption = { label: string; from: string; to: string }

function buildPeriodOptions(monthRows: MonthRow[]): PeriodOption[] {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  const last3From = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const last6From = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const last3Str = `${last3From.getFullYear()}-${pad(last3From.getMonth() + 1)}-01`
  const last6Str = `${last6From.getFullYear()}-${pad(last6From.getMonth() + 1)}-01`

  const fixed: PeriodOption[] = [
    { label: 'All Time', from: '', to: '' },
    { label: 'Last 3 Months', from: last3Str, to: todayStr },
    { label: 'Last 6 Months', from: last6Str, to: todayStr },
  ]

  // Individual months from actual data, most recent first
  const individualMonths: PeriodOption[] = [...monthRows]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map(m => {
      const d = new Date(m.month + '-01')
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      return {
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        from: m.month + '-01',
        to: `${m.month}-${pad(lastDay)}`
      }
    })

  return [...fixed, ...individualMonths]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NicheReports() {
  const [activeTab, setActiveTab] = useState<'overall' | 'per-cohort'>('overall')
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('All Time')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { loading, volume, funnel, finance, courseRows, cohortBars, monthRows, perCohortData } =
    useNicheReportsData(dateRange)
  const { showToast } = useToast()

  const periodOptions = buildPeriodOptions(monthRows)

  const handlePeriodSelect = (opt: PeriodOption) => {
    setSelectedPeriodLabel(opt.label)
    setDateRange({ from: opt.from, to: opt.to })
    setDropdownOpen(false)
  }

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    const reportEl = document.getElementById('niche-report-overall')
    if (!reportEl || !volume || !funnel || !finance) return
    setExporting(true)
    try {
      // Collect page CSS (Tailwind)
      const styleSheets = Array.from(document.styleSheets)
      let cssText = ''
      styleSheets.forEach(sheet => {
        try { Array.from(sheet.cssRules || []).forEach(r => { cssText += r.cssText + '\n' }) } catch {}
      })

      const period = selectedPeriodLabel
      const reportHTML = reportEl.innerHTML

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
${cssText}
* { box-sizing: border-box; }
body { margin: 0; padding: 28px 32px; background: #fff; font-family: Arial, sans-serif; }
.pdf-header { text-align: center; padding-bottom: 18px; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
.pdf-header-org { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; color: #111827; }
.pdf-header-sub { font-family: 'Poppins', sans-serif; font-size: 10px; color: #6b7280; margin-top: 3px; }
section { page-break-inside: avoid; margin-bottom: 24px; }
.grid { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="pdf-header">
  <div class="pdf-header-org">Nestara Institute of Care &amp; Hospitality Excellence</div>
  <div class="pdf-header-sub">${period} Performance Report</div>
</div>
${reportHTML}
</body>
</html>`

      const headerTemplate = '<span></span>'

      const filename = `NICHE-Report-${period.replace(/\s+/g, '-')}.pdf`
      
      // Check if running locally
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('192.168') ||
                     window.location.port !== ''
      
      const apiEndpoint = isLocal ? 'http://localhost:3001/generate-pdf' : '/api/generate-pdf'

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html, filename,
          options: {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: false,
            margin: { top: '20px', bottom: '20px', left: '0', right: '0' }
          }
        })
      })
      if (!res.ok) throw new Error('service')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      showToast(
        err?.message === 'service' || err?.message?.includes('fetch')
          ? 'PDF service not running — run: npm run pdf-service'
          : 'Export failed',
        'error'
      )
    } finally {
      setExporting(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="p-6 max-w-[210mm] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NICHE Reports</h1>
          <p className="text-sm text-gray-500">Live analytics for NICHE training programme</p>
        </div>
        
        {/* Period Dropdown + Export */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-nestalk-primary transition-colors text-sm font-medium text-gray-700"
            >
              <span>{selectedPeriodLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="py-1">
                  {periodOptions.map((opt, i) => (
                    <React.Fragment key={opt.label}>
                      {i === 3 && <div className="border-t border-gray-100 my-1" />}
                      <button
                        onClick={() => handlePeriodSelect(opt)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          selectedPeriodLabel === opt.label
                            ? 'bg-nestalk-primary/10 text-nestalk-primary font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export button — only on Overall tab */}
          {activeTab === 'overall' && (
            <button
              onClick={handleExport}
              disabled={exporting || loading}
              title={`Export ${selectedPeriodLabel} as PDF`}
              className="flex items-center justify-center w-9 h-9 bg-white border border-gray-300 rounded-lg hover:border-nestalk-primary hover:text-nestalk-primary transition-colors text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting
                ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['overall', 'per-cohort'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-nestalk-primary text-nestalk-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'per-cohort' ? 'Per Cohort' : 'Overall'}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      )}

      {/* Content */}
      {!loading && activeTab === 'overall' && volume && funnel && finance && (
        <OverallTab
          volume={volume}
          funnel={funnel}
          finance={finance}
          courseRows={courseRows}
          cohortBars={cohortBars}
          monthRows={monthRows}
          perCohortData={perCohortData}
        />
      )}

      {!loading && activeTab === 'per-cohort' && (
        <PerCohortTab perCohortData={perCohortData} />
      )}
    </div>
  )
}
