import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, DollarSign, CreditCard, Eye, UserPlus, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'

interface NicheFee {
  id: string
  training_id: string
  course_fee: number
  payment_plan: 'Full' | 'Installments'
  total_paid: number
  balance_due: number
  sponsored_amount: number
  extra_charges: number
  extra_charges_note: string
  payment_status: 'Pending' | 'Partial' | 'Paid' | 'Overdue'
  created_at: string
  updated_at: string
  // Joined data
  student_name: string
  student_phone: string
  course_name: string
  cohort_id?: string
  cohort_number?: number
  training_type?: '2week' | 'weekend' | 'refresher'
  training_status?: 'Active' | 'Graduated'
}

interface NicheCohort {
  id: string
  cohort_number: number
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed'
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
}

interface ActiveStudent {
  id: string
  name: string
  phone: string
  course: string
  course_fee?: number
}

export function NicheFees() {
  const [fees, setFees] = useState<NicheFee[]>([])
  const [filteredFees, setFilteredFees] = useState<NicheFee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [cohorts, setCohorts] = useState<NicheCohort[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCohort, setFilterCohort] = useState('all')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'2week' | 'shortcourse'>('2week')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [showSponsorModal, setShowSponsorModal] = useState(false)
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState<NicheFee | null>(null)

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'M-Pesa'
  })

  const [sponsorForm, setSponsorForm] = useState({
    amount: ''
  })

  const [extraForm, setExtraForm] = useState({
    amount: '',
    note: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['all', 'Pending', 'Paid']

  useEffect(() => {
    loadFees()
    loadCohorts()
  }, [])

  useEffect(() => {
    filterFees()
  }, [fees, searchTerm, filterStatus, filterCohort])

  const loadCohorts = async () => {
    try {
      await supabase.rpc('update_cohort_statuses')
      
      const { data, error } = await supabase
        .from('niche_cohorts')
        .select('*')
        .order('cohort_number')

      if (error) throw error
      setCohorts(data || [])
    } catch (error) {
      console.error('Error loading cohorts:', error)
    }
  }

  const loadFees = async () => {
    try {
      // Get all active and graduated students with course fees
      const { data: activeStudents, error: studentsError } = await supabase
        .from('niche_training')
        .select(`
          id,
          name,
          phone,
          course,
          cohort_id,
          training_type,
          status,
          cohorts:niche_cohorts(id, cohort_number, start_date, end_date, status)
        `)
        .in('status', ['Active', 'Graduated', 'Completed'])

      if (studentsError) throw studentsError

      // Get course fees
      const { data: courses } = await supabase
        .from('niche_courses')
        .select('name, cost_kes')

      const courseMap = courses?.reduce((acc, course) => {
        acc[course.name] = course.cost_kes
        return acc
      }, {} as Record<string, number>) || {}
      
      console.log('Active students:', activeStudents)
      console.log('Course map:', courseMap)

      // Get existing fee records for Active and Graduated students
      const { data: existingFees, error: feesError } = await supabase
        .from('niche_fees')
        .select(`
          *,
          niche_training!inner(name, phone, course, status, cohort_id, training_type, cohorts:niche_cohorts(id, cohort_number, start_date, end_date, status))
        `)
        .in('niche_training.status', ['Active', 'Graduated', 'Completed'])
        .order('niche_training(name)', { ascending: true })

      if (feesError) throw feesError

      // Get all payments for existing fees
      const feeIds = existingFees?.map(f => f.id) || []
      const { data: paymentsData } = await supabase
        .from('niche_payments')
        .select('fee_id, amount')
        .in('fee_id', feeIds)

      // Calculate total payments per fee
      const paymentTotals = paymentsData?.reduce((acc, payment) => {
        acc[payment.fee_id] = (acc[payment.fee_id] || 0) + payment.amount
        return acc
      }, {} as Record<string, number>) || {}

      // Create fee records for students without existing records
      const existingTrainingIds = existingFees?.map(f => f.training_id) || []
      const studentsNeedingFees = activeStudents?.filter(s => !existingTrainingIds.includes(s.id)) || []

      if (studentsNeedingFees.length > 0) {
        const newFeeRecords = studentsNeedingFees.map(student => {
          const courseFee = courseMap[student.course] || 0
          console.log(`Student: ${student.name}, Course: "${student.course}", Fee: ${courseFee}, Available courses:`, Object.keys(courseMap))
          return {
            training_id: student.id,
            course_fee: courseFee,
            payment_plan: 'Full'
          }
        })

        const { error: insertError } = await supabase
          .from('niche_fees')
          .upsert(newFeeRecords, { onConflict: 'training_id', ignoreDuplicates: true })

        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }

        // Reload fees after inserting new records - Active and Graduated students
        const { data: updatedFees, error: updatedError } = await supabase
          .from('niche_fees')
          .select(`
            *,
            niche_training!inner(name, phone, course, status, cohort_id, training_type, cohorts:niche_cohorts(id, cohort_number, start_date, end_date, status))
          `)
          .in('niche_training.status', ['Active', 'Graduated', 'Completed'])
        
        const formattedFees = updatedFees?.map(fee => {
          const actualPayments = paymentTotals[fee.id] || 0
          const sponsoredAmt = (fee as any).sponsored_amount || 0
          const extraCharges = (fee as any).extra_charges || 0
          const balance = fee.course_fee + extraCharges - sponsoredAmt - actualPayments
          const paymentStatus = fee.course_fee > 0 && (actualPayments + sponsoredAmt) >= (fee.course_fee + extraCharges) ? 'Paid' : 'Pending'
          
          return {
            ...fee,
            student_name: fee.niche_training.name,
            student_phone: fee.niche_training.phone,
            course_name: fee.niche_training.course || 'No Course',
            cohort_id: fee.niche_training.cohort_id,
            cohort_number: fee.niche_training.cohorts?.cohort_number,
            training_type: fee.niche_training.training_type,
            sponsored_amount: sponsoredAmt,
            extra_charges: extraCharges,
            extra_charges_note: (fee as any).extra_charges_note || '',
            balance_due: Math.max(0, balance),
            payment_status: paymentStatus,
            training_status: fee.niche_training.status,
            actual_payments: actualPayments
          }
        }) || []

        // Remove duplicates: for flagship (2week) dedupe by training_id, for short course keep all
        const uniqueFees = formattedFees.filter((fee, index, self) => 
          fee.training_type === '2week' || fee.training_type === null
            ? index === self.findIndex(f => f.training_id === fee.training_id)
            : true
        )

        setFees(uniqueFees)
      } else {
        // Fix any existing fees with course_fee = 0 by looking up from courseMap
        const feesWithZeroCost = existingFees?.filter(fee => fee.course_fee === 0) || []
        for (const fee of feesWithZeroCost) {
          const correctFee = courseMap[fee.niche_training.course]
          if (correctFee && correctFee > 0) {
            await supabase.from('niche_fees').update({ course_fee: correctFee }).eq('id', fee.id)
            fee.course_fee = correctFee
          }
        }

        const formattedFees = existingFees?.map(fee => {
          const actualPayments = paymentTotals[fee.id] || 0
          const sponsoredAmt = (fee as any).sponsored_amount || 0
          const extraCharges = (fee as any).extra_charges || 0
          const balance = fee.course_fee + extraCharges - sponsoredAmt - actualPayments
          const paymentStatus = fee.course_fee > 0 && (actualPayments + sponsoredAmt) >= (fee.course_fee + extraCharges) ? 'Paid' : 'Pending'
          
          return {
            ...fee,
            student_name: fee.niche_training.name,
            student_phone: fee.niche_training.phone,
            course_name: fee.niche_training.course || 'No Course',
            cohort_id: fee.niche_training.cohort_id,
            cohort_number: fee.niche_training.cohorts?.cohort_number,
            training_type: fee.niche_training.training_type,
            sponsored_amount: sponsoredAmt,
            extra_charges: extraCharges,
            extra_charges_note: (fee as any).extra_charges_note || '',
            balance_due: Math.max(0, balance),
            payment_status: paymentStatus,
            training_status: fee.niche_training.status,
            actual_payments: actualPayments
          }
        }) || []

        // Remove duplicates: for flagship (2week) dedupe by training_id, for short course keep all
        const uniqueFees = formattedFees.filter((fee, index, self) => 
          fee.training_type === '2week' || fee.training_type === null
            ? index === self.findIndex(f => f.training_id === fee.training_id)
            : true
        )

        setFees(uniqueFees)
      }
    } catch (error) {
      console.error('Error loading fees:', error)
      showToast('Failed to load fees', 'error')
    } finally {
      setLoading(false)
    }
  }



  const filterFees = () => {
    let filtered = [...fees]

    if (searchTerm) {
      filtered = filtered.filter(fee =>
        fee.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fee.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fee.student_phone && fee.student_phone.includes(searchTerm))
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(fee => fee.payment_status === filterStatus)
    }

    if (filterCohort !== 'all') {
      filtered = filtered.filter(fee =>
        fee.training_type === 'weekend'
          ? true  // never filter short course by cohort
          : fee.cohort_id === filterCohort
      )
    }

    setFilteredFees(filtered)
  }

  const getRomanNumeral = (num: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num] || num.toString()
  }

  const getVisibleCohorts = () => {
    const today = new Date()
    return cohorts.filter(cohort => {
      const startDate = new Date(cohort.start_date)
      return today >= startDate || cohort.status === 'active'
    })
  }

  const getFlagshipTitle = () => {
    if (filterCohort === 'active') {
      const activeCohort = cohorts.find(c => c.status === 'active')
      return activeCohort ? `Cohort ${getRomanNumeral(activeCohort.cohort_number)}` : '2-Week Programs'
    } else if (filterCohort !== 'all') {
      const selectedCohort = cohorts.find(c => c.id === filterCohort)
      return selectedCohort ? `Cohort ${getRomanNumeral(selectedCohort.cohort_number)}` : '2-Week Programs'
    }
    return 'All Cohorts'
  }

  const flagshipFees = filteredFees.filter(fee => 
    fee.course_name === 'Professional House Manager Training Program' || 
    fee.course_name === 'Professional Nanny Training Program'
  )
  
  const specializedFees = filteredFees.filter(fee => 
    fee.course_name !== 'Professional House Manager Training Program' && 
    fee.course_name !== 'Professional Nanny Training Program'
  )



  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return

    try {
      const amount = parseInt(sponsorForm.amount)
      if (amount <= 0) {
        showToast('Invalid sponsor amount', 'error')
        return
      }

      const { error } = await supabase
        .from('niche_fees')
        .update({ 
          sponsored_amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFee.id)

      if (error) throw error

      // Log activity
      await ActivityLogger.logCreate(
        user?.id || '',
        'niche_fees',
        selectedFee.id,
        `Sponsor amount of KSh ${amount.toLocaleString()} applied for ${selectedFee.student_name}`,
        staff?.name || user?.email || 'Unknown'
      )

      showToast(`Sponsor amount of KSh ${amount.toLocaleString()} applied successfully`, 'success')
      setShowSponsorModal(false)
      setSponsorForm({ amount: '' })
      loadFees()
    } catch (error: any) {
      console.error('Error adding sponsor:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }
  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return
    try {
      const amount = parseInt(extraForm.amount)
      if (amount <= 0) { showToast('Invalid amount', 'error'); return }
      const { error } = await supabase
        .from('niche_fees')
        .update({ extra_charges: amount, extra_charges_note: extraForm.note, updated_at: new Date().toISOString() })
        .eq('id', selectedFee.id)
      if (error) throw error
      await ActivityLogger.logCreate(user?.id || '', 'niche_fees', selectedFee.id,
        `Extra charge of KSh ${amount.toLocaleString()} (${extraForm.note}) added for ${selectedFee.student_name}`,
        staff?.name || user?.email || 'Unknown')
      showToast(`Extra charge of KSh ${amount.toLocaleString()} added`, 'success')
      setShowExtraModal(false)
      setExtraForm({ amount: '', note: '' })
      loadFees()
    } catch (error: any) {
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return

    try {
      const amount = parseInt(paymentForm.amount)
      if (amount <= 0 || amount > selectedFee.balance_due) {
        showToast('Invalid payment amount', 'error')
        return
      }

      const { error } = await supabase
        .from('niche_payments')
        .insert({
          fee_id: selectedFee.id,
          amount,
          payment_method: paymentForm.payment_method,
          created_by: staff?.name || user?.email || 'Unknown'
        })

      if (error) throw error

      // Update total_paid in niche_fees
      const { error: updateError } = await supabase
        .from('niche_fees')
        .update({ 
          total_paid: selectedFee.total_paid + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFee.id)

      if (updateError) throw updateError

      // Log activity
      await ActivityLogger.logCreate(
        user?.id || '',
        'niche_payments',
        '',
        `Payment of KSh ${amount.toLocaleString()} recorded for ${selectedFee.student_name}`,
        staff?.name || user?.email || 'Unknown'
      )

      showToast('Payment recorded successfully', 'success')
      setShowPaymentModal(false)
      setPaymentForm({ amount: '', payment_method: 'Cash' })
      loadFees()
    } catch (error: any) {
      console.error('Error adding payment:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const loadPaymentHistory = async (feeId: string) => {
    try {
      const { data, error } = await supabase
        .from('niche_payments')
        .select('*')
        .eq('fee_id', feeId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error loading payment history:', error)
      setPayments([])
    }
  }



  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NICHE Fees</h1>
          <p className="text-gray-600">Manage student fees and payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      {(() => {
        const allFees = fees
        const flagship = fees.filter(f => f.course_name === 'Professional House Manager Training Program' || f.course_name === 'Professional Nanny Training Program')
        const shortCourse = fees.filter(f => f.course_name !== 'Professional House Manager Training Program' && f.course_name !== 'Professional Nanny Training Program')
        const totalExpected = allFees.reduce((s, f) => s + f.course_fee + (f.extra_charges || 0), 0)
        const totalCollected = allFees.reduce((s, f) => s + ((f as any).actual_payments || 0) + (f.sponsored_amount || 0), 0)
        const totalBalance = allFees.reduce((s, f) => s + f.balance_due, 0)
        const totalSponsored = allFees.reduce((s, f) => s + (f.sponsored_amount || 0), 0)
        const flagshipCollected = flagship.reduce((s, f) => s + ((f as any).actual_payments || 0) + (f.sponsored_amount || 0), 0)
        const flagshipBalance = flagship.reduce((s, f) => s + f.balance_due, 0)
        const shortCollected = shortCourse.reduce((s, f) => s + ((f as any).actual_payments || 0) + (f.sponsored_amount || 0), 0)
        const shortBalance = shortCourse.reduce((s, f) => s + f.balance_due, 0)
        return (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: '#ae491e' }}>
                <div className="text-xs text-gray-500 mb-1">Total Students</div>
                <div className="text-2xl font-bold text-gray-900">{allFees.length}</div>
                <div className="text-xs text-gray-400 mt-1">{flagship.length} flagship · {shortCourse.length} short course</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="text-xs text-gray-500 mb-1">Total Collected</div>
                <div className="text-2xl font-bold text-green-700">KSh {totalCollected.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{allFees.filter(f => f.payment_status === 'Paid').length} fully paid</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="text-xs text-gray-500 mb-1">Outstanding Balance</div>
                <div className="text-2xl font-bold text-red-600">KSh {totalBalance.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{allFees.filter(f => f.balance_due > 0).length} students with balance</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="text-xs text-gray-500 mb-1">Total Sponsored</div>
                <div className="text-2xl font-bold text-blue-600">KSh {totalSponsored.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{allFees.filter(f => (f.sponsored_amount || 0) > 0).length} students sponsored</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-orange-50 rounded-lg shadow p-4 border-l-4" style={{ borderColor: '#ae491e' }}>
                <div className="text-xs text-gray-500 mb-1">Total Revenue Expected</div>
                <div className="text-2xl font-bold" style={{ color: '#ae491e' }}>KSh {totalExpected.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{Math.round(totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0)}% collected</div>
              </div>
              <div className="bg-orange-50 rounded-lg shadow p-4 border-l-4" style={{ borderColor: '#ae491e' }}>
                <div className="text-xs text-gray-500 mb-1">🎓 2-Week Collected</div>
                <div className="text-2xl font-bold text-green-700">KSh {flagshipCollected.toLocaleString()}</div>
                <div className="text-xs text-red-500 mt-1">KSh {flagshipBalance.toLocaleString()} outstanding</div>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="text-xs text-gray-500 mb-1">📚 Short Course Collected</div>
                <div className="text-2xl font-bold text-purple-700">KSh {shortCollected.toLocaleString()}</div>
                <div className="text-xs text-red-500 mt-1">KSh {shortBalance.toLocaleString()} outstanding</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-400">
                <div className="text-xs text-gray-500 mb-1">Extra Charges</div>
                <div className="text-2xl font-bold text-orange-600">KSh {allFees.reduce((s, f) => s + (f.extra_charges || 0), 0).toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{allFees.filter(f => (f.extra_charges || 0) > 0).length} students with extras</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('2week')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === '2week' ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          🎓 2-Week Flagship ({flagshipFees.length})
        </button>
        <button
          onClick={() => setActiveTab('shortcourse')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'shortcourse' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          📚 Short Course ({specializedFees.length})
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by student name, course, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">All Status</option>
            {statusOptions.slice(1).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          {activeTab === '2week' && (
            <select
              value={filterCohort}
              onChange={(e) => setFilterCohort(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Cohorts</option>
              {getVisibleCohorts().map(cohort => (
                <option key={cohort.id} value={cohort.id}>
                  Cohort {getRomanNumeral(cohort.cohort_number)}{cohort.status === 'active' ? ' (active)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-6">
        {/* 2-Week Programs Section */}
        {activeTab === '2week' && flagshipFees.length > 0 && (
          <div className="mb-10">
            <div className="rounded-t-lg p-4" style={{ backgroundColor: '#ae491e' }}>
              <h2 className="text-xl font-bold text-white flex items-center">
                <div className="w-2 h-8 bg-white rounded mr-3"></div>
                {getFlagshipTitle()}
                <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {flagshipFees.length} students
                </span>
              </h2>
            </div>
            <div className="bg-white rounded-b-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cohort</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsored</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {flagshipFees.map((fee, index) => (
                      <tr key={fee.id} className="hover:bg-blue-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {fee.student_name}
                            {fee.payment_status === 'Paid' && (
                              <svg className="w-4 h-4 ml-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{fee.student_phone?.replace(/\D/g, '').replace(/^254/, '+254')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.course_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {fee.cohort_number ? getRomanNumeral(fee.cohort_number) : 'No cohort'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {fee.course_fee.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">KSh {(fee.sponsored_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">KSh {((fee as any).actual_payments || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">KSh {fee.balance_due.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={fee.payment_status} type="payment" /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setSelectedFee(fee); loadPaymentHistory(fee.id); setShowPaymentHistory(true) }} className="text-blue-600 hover:text-blue-800 mr-2" title="View Payment History"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedFee(fee); setShowPaymentModal(true) }} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Pay</button>
                            <button onClick={() => { setSelectedFee(fee); setShowSponsorModal(true) }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 ml-1">Sponsor</button>
                            <button onClick={() => { setSelectedFee(fee); setExtraForm({ amount: String(fee.extra_charges || ''), note: fee.extra_charges_note || '' }); setShowExtraModal(true) }} className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 ml-1">+ Extra</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === '2week' && flagshipFees.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No 2-week flagship fee records found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Specialized Skills Section */}
        {activeTab === 'shortcourse' && specializedFees.length > 0 && (
          <div className="mb-8">
            <div className="rounded-t-lg p-4" style={{ backgroundColor: '#ae491e' }}>
              <h2 className="text-xl font-bold text-white flex items-center">
                <div className="w-2 h-8 bg-white rounded mr-3"></div>
                Specialized Skills Training
                <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {specializedFees.length} students
                </span>
              </h2>
            </div>
            <div className="bg-white rounded-b-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsored</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {specializedFees.map((fee, index) => (
                      <tr key={fee.id} className="hover:bg-purple-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {fee.student_name}
                            {fee.payment_status === 'Paid' && (
                              <svg className="w-4 h-4 ml-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{fee.student_phone?.replace(/\D/g, '').replace(/^254/, '+254')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.course_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {fee.course_fee.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">KSh {(fee.sponsored_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">KSh {((fee as any).actual_payments || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">KSh {fee.balance_due.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={fee.payment_status} type="payment" /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setSelectedFee(fee); loadPaymentHistory(fee.id); setShowPaymentHistory(true) }} className="text-blue-600 hover:text-blue-800 mr-2" title="View Payment History"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedFee(fee); setShowPaymentModal(true) }} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Pay</button>
                            <button onClick={() => { setSelectedFee(fee); setShowSponsorModal(true) }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 ml-1">Sponsor</button>
                            <button onClick={() => { setSelectedFee(fee); setExtraForm({ amount: String(fee.extra_charges || ''), note: fee.extra_charges_note || '' }); setShowExtraModal(true) }} className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 ml-1">+ Extra</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shortcourse' && specializedFees.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No short course fee records found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>



      {/* Extra Charges Modal */}
      {showExtraModal && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Extra Charge — {selectedFee.student_name}</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <div>Course Fee: KSh {selectedFee.course_fee.toLocaleString()}</div>
                {(selectedFee.extra_charges || 0) > 0 && <div className="text-orange-600">Current Extra: KSh {selectedFee.extra_charges.toLocaleString()} ({selectedFee.extra_charges_note})</div>}
              </div>
              <form onSubmit={handleAddExtra} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh) *</label>
                  <input type="number" required min="1" value={extraForm.amount}
                    onChange={(e) => setExtraForm({ ...extraForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary"
                    placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input type="text" required value={extraForm.note}
                    onChange={(e) => setExtraForm({ ...extraForm, note: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary"
                    placeholder="e.g. Good Conduct Certificate" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowExtraModal(false); setExtraForm({ amount: '', note: '' }) }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Add Extra</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Sponsor Modal */}
      {showSponsorModal && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Add Sponsor Amount for {selectedFee.student_name}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Course Fee: KSh {selectedFee.course_fee.toLocaleString()}</div>
                  <div>Current Balance: KSh {selectedFee.balance_due.toLocaleString()}</div>
                </div>
              </div>

              <form onSubmit={handleAddSponsor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sponsorForm.amount}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSponsorModal(false)
                      setSponsorForm({ amount: '' })
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Sponsor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Add Payment for {selectedFee.student_name}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Course Fee: KSh {selectedFee.course_fee.toLocaleString()}</div>
                  <div>Paid: KSh {selectedFee.total_paid.toLocaleString()}</div>
                  <div className="font-medium">Balance: KSh {selectedFee.balance_due.toLocaleString()}</div>
                </div>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={Math.max(1, selectedFee.balance_due)}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false)
                      setPaymentForm({ amount: '', payment_method: 'Cash', reference_number: '', notes: '' })
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment History - {selectedFee.student_name}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Course Fee:</span>
                    <div>KSh {selectedFee.course_fee.toLocaleString()}{(selectedFee.extra_charges || 0) > 0 && <span className="text-orange-600"> +{selectedFee.extra_charges.toLocaleString()}</span>}</div>
                  </div>
                  <div>
                    <span className="font-medium">Sponsored:</span>
                    <div className="text-blue-600">KSh {(selectedFee.sponsored_amount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Total Paid:</span>
                    <div className="text-green-600">KSh {((selectedFee as any).actual_payments || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Balance:</span>
                    <div className="text-red-600">KSh {selectedFee.balance_due.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(selectedFee.sponsored_amount || 0) > 0 && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="font-medium text-blue-700">KSh {(selectedFee.sponsored_amount).toLocaleString()}</div>
                    <div className="text-sm text-blue-600 mt-1">Nestara Sponsorship</div>
                  </div>
                )}
                {(selectedFee.extra_charges || 0) > 0 && (
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="font-medium text-orange-700">+ KSh {(selectedFee.extra_charges).toLocaleString()}</div>
                    <div className="text-sm text-orange-600 mt-1">Extra Charge: {selectedFee.extra_charges_note || 'Additional fee'}</div>
                  </div>
                )}
                {payments.length === 0 && (selectedFee.sponsored_amount || 0) === 0 ? (
                  <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-green-600">
                            KSh {payment.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(() => {
                              const date = new Date(payment.payment_date)
                              const day = date.getDate()
                              const month = date.toLocaleDateString('en-US', { month: 'long' })
                              const year = date.getFullYear()
                              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                              const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                                           day === 2 || day === 22 ? 'nd' : 
                                           day === 3 || day === 23 ? 'rd' : 'th'
                              return `${dayName}, ${day}${suffix} ${month} ${year}`
                            })()} - KSh {payment.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {payment.reference_number && (
                        <div className="text-sm text-gray-600">
                          Ref: {payment.reference_number}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {payment.notes}
                        </div>
                      )}
                      {payment.created_by && (
                        <div className="text-xs text-gray-400 mt-1">
                          Recorded by: {payment.created_by}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPaymentHistory(false)
                    setSelectedFee(null)
                    setPayments([])
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}