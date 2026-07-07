import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Users, Edit, Trash2, Copy, Minus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface Cohort {
  id: string
  cohort_number: number
  status: 'upcoming' | 'active' | 'completed'
}

interface StaffMember {
  id: string
  name: string
  phone?: string
  email?: string
  role?: string
  niche_training_id?: string
  employment_status?: string
  salary?: number
  availability?: string
  signed_coc: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  niche_training?: {
    cohort_id?: string
    niche_cohorts?: {
      id: string
      cohort_number: number
      status: string
    }
  }
  meetingsAttended?: number
  referrals?: number
}

interface StaffMeeting {
  id: string
  title: string
  meeting_type: 'General Meeting' | 'Online Webinar' | 'Training Session' | 'Welfare Meeting'
  date_time: string
  location?: string
  notes?: string
  is_finalized: boolean
  created_at: string
  created_by?: string
}

interface MeetingAttendance {
  id: string
  meeting_id: string
  staff_id: string
  present: boolean
  notes?: string
  staff?: StaffMember
}

interface Contribution {
  id: string
  staff_id: string
  contribution_type: 'Volunteer Work' | 'Leadership' | 'Referral'
  description: string
  points: number
  referral_staff_id?: string
  date_of_contribution: string
  created_at: string
  created_by?: string
  staff?: StaffMember
}

const meetingTypes = ['General Meeting', 'Online Webinar', 'Training Session', 'Welfare Meeting']
const contributionTypes = ['Volunteer Work', 'Leadership', 'Referral']
const employmentStatuses = ['Employed', 'Yet to be Employed', 'Blacklisted']

export function StaffManagement() {
  const [activeTab, setActiveTab] = useState<'directory' | 'meetings' | 'referrals' | 'sponsorship' | 'welfare'>('directory')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [filteredStaffMembers, setFilteredStaffMembers] = useState<StaffMember[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [meetings, setMeetings] = useState<StaffMeeting[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [meetingSearch, setMeetingSearch] = useState('')
  const [meetingCohortFilter, setMeetingCohortFilter] = useState('all')
  const [referralSearch, setReferralSearch] = useState('')
  const [referralCohortFilter, setReferralCohortFilter] = useState('all')
  const [openMenuMeetingId, setOpenMenuMeetingId] = useState<string | null>(null)
  const [confirmDeleteMeetingId, setConfirmDeleteMeetingId] = useState<string | null>(null)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false)
  const [showAddContributionModal, setShowAddContributionModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<StaffMeeting | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [cohortFilter, setCohortFilter] = useState<string>('all')
  const [directorySearch, setDirectorySearch] = useState('')
  const [bulkAction, setBulkAction] = useState<'none' | 'mark_signed' | 'update_employment'>('none')
  const [bulkEmploymentStatus, setBulkEmploymentStatus] = useState<string>('')
  const [bulkCocStatus, setBulkCocStatus] = useState<'yes' | 'no' | ''>('')
  
  const { user, staff } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
    // Auto-sync graduates on page load
    autoSyncGraduates()
  }, [])

  useEffect(() => {
    // Filter staff by cohort
    if (cohortFilter === 'all') {
      setFilteredStaffMembers(staffMembers)
    } else {
      setFilteredStaffMembers(
        staffMembers.filter(member => {
          const memberCohortId = member.niche_training?.niche_cohorts?.id
          return memberCohortId === cohortFilter
        })
      )
    }
  }, [cohortFilter, staffMembers])

  const handleToggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId) 
        : [...prev, staffId]
    )
  }

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === filteredStaffMembers.length) {
      setSelectedStaffIds([])
    } else {
      setSelectedStaffIds(filteredStaffMembers.map(m => m.id))
    }
  }

  const handleBulkUpdateCoc = async () => {
    if (selectedStaffIds.length === 0) {
      showToast('Please select at least one staff member', 'error')
      return
    }
    if (!bulkCocStatus) {
      showToast('Please select a status (Yes/No)', 'error')
      return
    }
    
    try {
      const promises = selectedStaffIds.map(id =>
        supabase.from('newstaff_members')
          .update({ signed_coc: bulkCocStatus === 'yes' })
          .eq('id', id)
      )
      
      await Promise.all(promises)
      showToast(`Successfully updated ${selectedStaffIds.length} staff CoC status to ${bulkCocStatus}`, 'success')
      setSelectedStaffIds([])
      setBulkCocStatus('')
      loadData()
    } catch (error) {
      console.error('Error in bulk update CoC:', error)
      showToast('Failed to update staff', 'error')
    }
  }

  const handleBulkUpdateEmployment = async () => {
    if (selectedStaffIds.length === 0) {
      showToast('Please select at least one staff member', 'error')
      return
    }
    if (!bulkEmploymentStatus) {
      showToast('Please select an employment status', 'error')
      return
    }
    
    try {
      const promises = selectedStaffIds.map(id =>
        supabase.from('newstaff_members')
          .update({ employment_status: bulkEmploymentStatus })
          .eq('id', id)
      )
      
      await Promise.all(promises)
      showToast(`Successfully updated employment status for ${selectedStaffIds.length} staff`, 'success')
      setSelectedStaffIds([])
      setBulkEmploymentStatus('')
      loadData()
    } catch (error) {
      console.error('Error in bulk update employment:', error)
      showToast('Failed to update staff', 'error')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [staffRes, meetingsRes, contributionsRes, cohortsRes, attendanceRes] = await Promise.all([
        supabase.from('newstaff_members').select(`
          *,
          niche_training: niche_training_id (
            cohort_id,
            niche_cohorts: cohort_id (
              id,
              cohort_number,
              status
            )
          )
        `).order('name', { ascending: true }),
        supabase.from('newstaff_meetings').select('*').order('date_time', { ascending: false }),
        supabase.from('newstaff_contributions').select('*, staff:newstaff_members(*)').order('created_at', { ascending: false }),
        supabase.from('niche_cohorts').select('*').order('cohort_number', { ascending: true }),
        supabase.from('newstaff_meeting_attendance').select('*')
      ])
      
      if (staffRes.data) {
        // Calculate meetings attended and referrals for each staff member
        const staffWithStats = staffRes.data.map(member => {
          const meetingsAttended = attendanceRes.data?.filter(
            a => a.staff_id === member.id && a.present
          ).length || 0
          
          const referrals = contributionsRes.data?.filter(
            c => c.staff_id === member.id && c.contribution_type === 'Referral'
          ).length || 0
          
          return {
            ...member,
            meetingsAttended,
            referrals
          } as StaffMember
        })
        
        // Order alphabetically by name
        const sorted = [...staffWithStats].sort((a, b) => a.name.localeCompare(b.name))
        setStaffMembers(sorted as StaffMember[])
        setFilteredStaffMembers(sorted as StaffMember[])
      }
      
      if (cohortsRes.data) {
        setCohorts(cohortsRes.data as Cohort[])
      }
      if (meetingsRes.data) setMeetings(meetingsRes.data)
      if (contributionsRes.data) setContributions(contributionsRes.data)
      if (attendanceRes.data) setAttendance(attendanceRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadAttendance = async (meetingId: string) => {
    try {
      const { data } = await supabase
        .from('newstaff_meeting_attendance')
        .select('*, staff:newstaff_members(*)')
        .eq('meeting_id', meetingId)
      if (data) setAttendance(data)
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('newstaff_members').insert({
        ...formData,
        created_by: staff?.name || user?.email || 'System',
        updated_by: staff?.name || user?.email || 'System'
      })
      if (error) throw error
      showToast('Staff member added successfully', 'success')
      setShowAddStaffModal(false)
      setFormData({})
      loadData()
    } catch (error: any) {
      console.error('Error adding staff:', error)
      showToast(error?.message || 'Failed to add staff', 'error')
    }
  }

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const meetingData = {
        title: formData.date_time,
        meeting_type: formData.meeting_type || 'General Meeting',
        date_time: formData.date_time,
        notes: formData.notes,
        created_by: staff?.name || user?.email || 'System'
      }
      const { error, data } = await supabase.from('newstaff_meetings').insert(meetingData).select()
      if (error) throw error
      if (data && data[0]) {
        setSelectedMeeting(data[0])
        loadAttendance(data[0].id)
      }
      showToast('Meeting created successfully', 'success')
      setShowAddMeetingModal(false)
      setFormData({})
      loadData()
    } catch (error: any) {
      console.error('Error adding meeting:', error)
      showToast(error?.message || 'Failed to add meeting', 'error')
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await supabase.from('newstaff_meeting_attendance').delete().eq('meeting_id', meetingId)
      await supabase.from('newstaff_meetings').delete().eq('id', meetingId)
      if (selectedMeeting?.id === meetingId) setSelectedMeeting(null)
      setConfirmDeleteMeetingId(null)
      setOpenMenuMeetingId(null)
      showToast('Meeting deleted', 'success')
      loadData()
    } catch (error) {
      console.error('Error deleting meeting:', error)
      showToast('Failed to delete meeting', 'error')
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('newstaff_contributions').insert({
        ...formData,
        created_by: staff?.name || user?.email || 'System'
      })
      if (error) throw error
      showToast('Contribution recorded successfully', 'success')
      setShowAddContributionModal(false)
      setFormData({})
      loadData()
    } catch (error: any) {
      console.error('Error adding contribution:', error)
      showToast(error?.message || 'Failed to add contribution', 'error')
    }
  }

  const handleToggleAttendance = async (meetingId: string, staffId: string, currentStatus: boolean) => {
    try {
      const existing = attendance.find(a => a.meeting_id === meetingId && a.staff_id === staffId)
      if (existing) {
        await supabase
          .from('newstaff_meeting_attendance')
          .update({ present: !currentStatus })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('newstaff_meeting_attendance')
          .insert({
            meeting_id: meetingId,
            staff_id: staffId,
            present: true
          })
      }
      loadAttendance(meetingId)
    } catch (error) {
      console.error('Error updating attendance:', error)
      showToast('Failed to update attendance', 'error')
    }
  }

  const formatMeetingDate = (date_time: string) => {
    const raw = date_time?.split('T')[0] || date_time
    const [year, month, day] = raw.split('-').map(Number)
    if (!year || !month || !day) return raw
    const d = new Date(year, month - 1, day)
    const suffix = [11,12,13].includes(day) ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'
    return d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase() + ' ' + day + suffix + ' ' + d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  const handleCopyAttendanceList = (meeting: StaffMeeting) => {
    const nonBlacklisted = staffMembers.filter(m => m.employment_status !== 'Blacklisted')
    // Group by cohort
    const cohortGroups: { label: string; members: StaffMember[] }[] = []
    const cohortIds = [...new Set(nonBlacklisted.map(m => m.niche_training?.niche_cohorts?.id || '__none__'))]
    cohortIds.forEach(cid => {
      const members = nonBlacklisted.filter(m => (m.niche_training?.niche_cohorts?.id || '__none__') === cid)
      const cohortNum = members[0]?.niche_training?.niche_cohorts?.cohort_number
      cohortGroups.push({ label: cohortNum ? `Cohort ${cohortNum}` : 'No Cohort', members, cohortNum: cohortNum || 9999 })
    })
    cohortGroups.sort((a, b) => (a as any).cohortNum - (b as any).cohortNum)

    let lines = [`${formatMeetingDate(meeting.date_time)}, ${meeting.meeting_type || 'Meeting'} Attendance`, '']
    cohortGroups.forEach(group => {
      lines.push(`${group.label}`)
      const present = group.members.filter(m => attendance.find(a => a.meeting_id === meeting.id && a.staff_id === m.id && a.present))
      const absent = group.members.filter(m => !attendance.find(a => a.meeting_id === meeting.id && a.staff_id === m.id && a.present))
      present.forEach((m, i) => lines.push(`  ${i + 1}. ${m.name} → Present ✓`))
      absent.forEach((m, i) => lines.push(`  ${present.length + i + 1}. ${m.name} → Absent ✗`))
      lines.push('')
    })

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast('Attendance list copied!', 'success')
    }).catch(() => showToast('Failed to copy', 'error'))
  }

  const handleUpdateReferrals = async (staffId: string, current: number, delta: number) => {
    if (delta === 0) return
    try {
      if (delta > 0) {
        await supabase.from('newstaff_contributions').insert({
          staff_id: staffId,
          contribution_type: 'Referral',
          description: 'Referral',
          points: 10,
          date_of_contribution: new Date().toISOString().split('T')[0],
          created_by: staff?.name || user?.email || 'System'
        })
      } else {
        const { data } = await supabase
          .from('newstaff_contributions')
          .select('id')
          .eq('staff_id', staffId)
          .eq('contribution_type', 'Referral')
          .order('created_at', { ascending: false })
          .limit(1)
        if (data && data[0]) {
          await supabase.from('newstaff_contributions').delete().eq('id', data[0].id)
        }
      }
      const next = Math.max(0, current + delta)
      setStaffMembers(prev => prev.map(m => m.id === staffId ? { ...m, referrals: next } : m))
      setFilteredStaffMembers(prev => prev.map(m => m.id === staffId ? { ...m, referrals: next } : m))
    } catch (error) {
      showToast('Failed to update referrals', 'error')
    }
  }

  const handleFinalizeMeeting = async (meetingId: string) => {
    try {
      await supabase
        .from('newstaff_meetings')
        .update({ is_finalized: true })
        .eq('id', meetingId)
      showToast('Meeting finalized!', 'success')
      loadData()
    } catch (error) {
      console.error('Error finalizing meeting:', error)
      showToast('Failed to finalize meeting', 'error')
    }
  }

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (confirm(`Are you sure you want to delete "${staffName}"? This action cannot be undone.`)) {
      try {
        await supabase
          .from('newstaff_members')
          .delete()
          .eq('id', staffId)
        showToast('Staff member deleted successfully', 'success')
        loadData()
      } catch (error) {
        console.error('Error deleting staff:', error)
        showToast('Failed to delete staff member', 'error')
      }
    }
  }

  const handleToggleCoc = async (staffId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('newstaff_members')
        .update({ signed_coc: !currentStatus })
        .eq('id', staffId)
      showToast('CoC status updated', 'success')
      loadData()
    } catch (error) {
      console.error('Error updating CoC:', error)
      showToast('Failed to update CoC status', 'error')
    }
  }

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return
    
    try {
      await supabase
        .from('newstaff_members')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role,
          employment_status: formData.employment_status,
          salary: formData.salary,
          availability: formData.availability,
          signed_coc: formData.signed_coc
        })
        .eq('id', selectedStaff.id)
      
      showToast('Staff member updated successfully', 'success')
      setShowEditModal(false)
      loadData()
    } catch (error) {
      console.error('Error updating staff', error)
      showToast('Failed to update staff member', 'error')
    }
  }

  const autoSyncGraduates = async () => {
    try {
      const { data, error } = await supabase.rpc('sync_graduates_to_staff')
      if (error) throw error
      
      if (data && (data.imported > 0 || data.updated > 0)) {
        showToast(`Sync complete: ${data.imported} new, ${data.updated} updated`, 'success')
      }
      loadData()
    } catch (error: any) {
      console.error('Error auto-syncing graduates:', error)
      // Don't show error on auto-sync to avoid spamming users
    }
  }

  const handleImportGraduates = async () => {
    try {
      const { data, error } = await supabase.rpc('sync_graduates_to_staff')
      if (error) throw error
      
      showToast(`Sync complete: ${data.imported} new, ${data.updated} updated, ${data.total} total`, 'success')
      loadData()
    } catch (error: any) {
      console.error('Error importing graduates:', error)
      showToast(error?.message || 'Failed to import graduates', 'error')
    }
  }

  const getStaffStats = (staffId: string) => {
    const meetingsAttended = attendance.filter(a => a.staff_id === staffId && a.present).length
    const staffContributions = contributions.filter(c => c.staff_id === staffId)
    const totalPoints = staffContributions.reduce((sum, c) => sum + (c.points || 0), 0)
    
    return { meetingsAttended, contributions: staffContributions.length, totalPoints }
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
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Management</h1>
        {activeTab === 'directory' && (
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <button
                onClick={handleImportGraduates}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                <Users className="w-4 h-4 mr-2" />
                Sync Graduates
              </button>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex overflow-x-auto space-x-2 sm:space-x-8 pb-1">
          {['Staff Directory', 'Meetings', 'Referrals', 'Sponsorship', 'Welfare'].map((name, i) => {
            const id = ['directory', 'meetings', 'referrals', 'sponsorship', 'welfare'][i]
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-2 px-3 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'border-nestalk-primary text-nestalk-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="text-sm font-medium text-gray-700">Filter by Cohort:</label>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={directorySearch}
                  onChange={e => setDirectorySearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                />
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                >
                  <option value="all">All Cohorts</option>
                  {cohorts
                    .filter(cohort => cohort.status !== 'upcoming')
                    .map(cohort => (
                    <option key={cohort.id} value={cohort.id}>
                      Cohort {cohort.cohort_number} {cohort.status === 'active' ? '(Active)' : cohort.status === 'completed' ? '(Completed)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">{filteredStaffMembers.length}/{staffMembers.length} members</span>
              </div>
            </div>

            {/* Bulk Actions Section */}
            {selectedStaffIds.length > 0 && (
              <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedStaffIds.length} staff selected
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <select
                        value={bulkCocStatus}
                        onChange={(e) => setBulkCocStatus(e.target.value as 'yes' | 'no')}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-auto"
                      >
                        <option value="">Select CoC Status</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                      <button
                        onClick={handleBulkUpdateCoc}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full sm:w-auto"
                      >
                        Update CoC Status
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <select
                        value={bulkEmploymentStatus}
                        onChange={(e) => setBulkEmploymentStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                      >
                        <option value="">Select Employment Status</option>
                        {employmentStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkUpdateEmployment}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto"
                      >
                        Update Employment
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedStaffIds([])}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 w-full sm:w-auto"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Staff Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.length === filteredStaffMembers.length && filteredStaffMembers.length > 0}
                          onChange={handleSelectAllStaff}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Meetings Attended</th>

                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Signed CoC</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStaffMembers
                      .filter(m => m.name.toLowerCase().includes(directorySearch.toLowerCase()))
                      .map((member, index) => (
                      <tr key={member.id} className={selectedStaffIds.includes(member.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.includes(member.id)}
                            onChange={() => handleToggleStaffSelection(member.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.niche_training?.niche_cohorts ? (
                              <>
                                {member.name} <span className="text-xs text-orange-600 italic">Cohort {member.niche_training.niche_cohorts.cohort_number}</span>
                              </>
                            ) : (
                              member.name
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {member.referrals || 0}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {member.meetingsAttended || 0}
                        </td>

                        <td className="px-3 py-4 whitespace-nowrap text-center w-32">
                          <span className={`text-sm font-medium ${
                            member.signed_coc
                              ? 'text-green-800'
                              : 'text-gray-600'
                          }`}>
                            {member.signed_coc ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right w-28">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setSelectedStaff(member)
                                setFormData({ ...member })
                                setShowEditModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(member.id, member.name)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddMeetingModal(true)}
                className="flex items-center justify-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </button>
            </div>

            {meetings.map(meeting => (
              <div key={meeting.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{formatMeetingDate(meeting.date_time)}</p>
                    {meeting.meeting_type && <p className="text-xs text-gray-400 mt-0.5">{meeting.meeting_type}</p>}
                    {meeting.notes && <p className="text-sm text-gray-500 mt-1">{meeting.notes}</p>}
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={() => setOpenMenuMeetingId(openMenuMeetingId === meeting.id ? null : meeting.id)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >⋯</button>
                    {openMenuMeetingId === meeting.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => { setConfirmDeleteMeetingId(meeting.id); setOpenMenuMeetingId(null) }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedMeeting?.id === meeting.id ? (
                  <div className="border-t pt-4 mt-3">
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={meetingSearch}
                        onChange={e => setMeetingSearch(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                      />
                      <select
                        value={meetingCohortFilter}
                        onChange={e => setMeetingCohortFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                      >
                        <option value="all">All Cohorts</option>
                        {cohorts.filter(c => c.status !== 'upcoming').map(c => (
                          <option key={c.id} value={c.id}>Cohort {c.cohort_number}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {staffMembers
                        .filter(m => m.employment_status !== 'Blacklisted')
                        .filter(m => meetingCohortFilter === 'all' || m.niche_training?.niche_cohorts?.id === meetingCohortFilter)
                        .filter(m => m.name.toLowerCase().includes(meetingSearch.toLowerCase()))
                        .map(member => {
                          const att = attendance.find(a => a.meeting_id === meeting.id && a.staff_id === member.id)
                          return (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm truncate mr-2">{member.name}</span>
                              <button
                                onClick={() => handleToggleAttendance(meeting.id, member.id, !!att?.present)}
                                className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                                  att?.present ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {att?.present ? 'Present' : 'Absent'}
                              </button>
                            </div>
                          )
                        })}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                      <button onClick={() => setSelectedMeeting(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800 w-full sm:w-auto">
                        Close
                      </button>
                      <button
                        onClick={() => handleCopyAttendanceList(meeting)}
                        className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full sm:w-auto"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy List
                      </button>
                      <button
                        onClick={() => setSelectedMeeting(null)}
                        className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 w-full sm:w-auto"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedMeeting(meeting); loadAttendance(meeting.id) }}
                    className="mt-2 text-sm text-nestalk-primary hover:underline"
                  >
                    Take Attendance
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={referralSearch}
                  onChange={e => setReferralSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                />
                <select
                  value={referralCohortFilter}
                  onChange={e => setReferralCohortFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                >
                  <option value="all">All Cohorts</option>
                  {cohorts.filter(c => c.status !== 'upcoming').map(c => (
                    <option key={c.id} value={c.id}>Cohort {c.cohort_number}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffMembers
                      .filter(m => m.employment_status !== 'Blacklisted')
                      .filter(m => referralCohortFilter === 'all' || m.niche_training?.niche_cohorts?.id === referralCohortFilter)
                      .filter(m => m.name.toLowerCase().includes(referralSearch.toLowerCase()))
                      .map((member, index) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            {member.name}
                            {member.niche_training?.niche_cohorts && (
                              <span className="ml-2 text-xs text-orange-600 italic">Cohort {member.niche_training.niche_cohorts.cohort_number}</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleUpdateReferrals(member.id, member.referrals || 0, -1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold w-6 text-center">{member.referrals || 0}</span>
                              <button
                                onClick={() => handleUpdateReferrals(member.id, member.referrals || 0, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-nestalk-primary hover:bg-nestalk-primary/90 text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
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

        {activeTab === 'welfare' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welfare Management</h3>
            <p className="text-gray-500">Coming soon!</p>
          </div>
        )}

        {activeTab === 'sponsorship' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Sponsorship Candidates</h3>
              <p className="text-sm text-gray-500">Ranked by engagement points · Referral = 10pts · Meeting = 5pts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Meetings</th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...staffMembers]
                    .filter(m => m.employment_status !== 'Blacklisted')
                    .map(member => ({
                      ...member,
                      points: (member.meetingsAttended || 0) * 5 + (member.referrals || 0) * 10
                    }))
                    .sort((a, b) => b.points - a.points)
                    .map((member, index) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          {member.niche_training?.niche_cohorts && (
                            <span className="text-xs text-orange-600 italic">Cohort {member.niche_training.niche_cohorts.cohort_number}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{member.meetingsAttended || 0}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{member.referrals || 0}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-nestalk-primary">{member.points}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Add Staff Member</h2>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select
                    value={formData.employment_status || ''}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  >
                    <option value="">Select...</option>
                    {employmentStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="signed_coc"
                    checked={formData.signed_coc || false}
                    onChange={(e) => setFormData({ ...formData, signed_coc: e.target.checked })}
                    className="h-4 w-4 text-nestalk-primary focus:ring-nestalk-primary border-gray-300 rounded"
                  />
                  <label htmlFor="signed_coc" className="ml-2 block text-sm text-gray-700">Signed CoC</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStaffModal(false)
                      setFormData({})
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                  >
                    Add Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Staff Member</h2>
              <form onSubmit={handleEditStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select
                    value={formData.employment_status || ''}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  >
                    <option value="">Select...</option>
                    {employmentStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit_signed_coc"
                    checked={formData.signed_coc || false}
                    onChange={(e) => setFormData({ ...formData, signed_coc: e.target.checked })}
                    className="h-4 w-4 text-nestalk-primary focus:ring-nestalk-primary border-gray-300 rounded"
                  />
                  <label htmlFor="edit_signed_coc" className="ml-2 block text-sm text-gray-700">Signed CoC</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedStaff(null)
                      setFormData({})
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create Event</h2>
              <form onSubmit={handleAddMeeting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_time || ''}
                    onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.meeting_type || ''}
                    onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  >
                    <option value="">Select type...</option>
                    {meetingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => { setShowAddMeetingModal(false); setFormData({}) }} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Meeting Confirmation */}
      {confirmDeleteMeetingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Meeting</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this meeting? This will also remove all attendance records and cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteMeetingId(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={() => handleDeleteMeeting(confirmDeleteMeetingId)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contribution Modal removed - replaced by Referrals tab */}
    </div>
  )
}
