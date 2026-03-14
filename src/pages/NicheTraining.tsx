import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Edit, Users, UserPlus, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'

interface NicheCourse {
  id: string
  name: string
  description?: string
  duration_weeks?: number
  is_active: boolean
}

interface NicheCohort {
  id: string
  cohort_number: number
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed'
}

interface NicheTraining {
  id: string
  candidate_id?: string
  name: string
  phone?: string
  role?: string
  status: 'Pending' | 'Active' | 'Graduated' | 'Expelled'
  course?: string
  description?: string
  date_started?: string
  date_completed?: string
  notes?: string
  cohort_id?: string
  training_type?: '2week' | 'weekend' | 'refresher'
  accommodation_type?: 'live_in' | 'live_out'
  enrolled_courses?: string[]
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  cohorts?: NicheCohort
  has_grade?: boolean
}

interface Candidate {
  id: string
  name: string
  phone: string
  role: string
}

export function NicheTraining() {
  const [trainingRecords, setTrainingRecords] = useState<NicheTraining[]>([])
  const [filteredRecords, setFilteredRecords] = useState<NicheTraining[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [courses, setCourses] = useState<NicheCourse[]>([])
  const [cohorts, setCohorts] = useState<NicheCohort[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterCohort, setFilterCohort] = useState('active')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<NicheTraining | null>(null)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [formData, setFormData] = useState({
    candidate_id: '',
    name: '',
    phone: '',
    email: '',
    role: '',
    status: 'Pending' as 'Pending' | 'Active' | 'Graduated' | 'Expelled',
    course: '',
    cohort_id: '',
    training_type: '2week' as '2week' | 'weekend' | 'refresher',
    accommodation_type: '' as '' | 'live_in' | 'live_out',
    enrolled_courses: [] as string[]
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const [courseFilterOptions, setCourseFilterOptions] = useState<string[]>(['all'])

  useEffect(() => {
    loadTrainingRecords()
    loadCandidates()
    loadCourses()
    loadCohorts()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [trainingRecords, searchTerm, filterCourse, filterCohort])

  const loadTrainingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_training')
        .select(`
          *,
          cohorts:niche_cohorts(id, cohort_number, start_date, end_date, status)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Check which trainees have grades
      const { data: gradesData } = await supabase
        .from('trainee_grades')
        .select('trainee_id')
      
      const gradedTraineeIds = new Set(gradesData?.map(g => g.trainee_id) || [])
      
      const recordsWithGradeStatus = (data || []).map(record => ({
        ...record,
        has_grade: gradedTraineeIds.has(record.id)
      }))
      
      setTrainingRecords(recordsWithGradeStatus)
      
      // Extract unique courses for filter options
      const uniqueCourses = [...new Set(data?.map(record => record.course).filter(Boolean))]
      setCourseFilterOptions(['all', ...uniqueCourses])
    } catch (error) {
      console.error('Error loading training records:', error)
      showToast('Failed to load training records', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, phone, role')
        .order('name')

      if (error) throw error
      setCandidates(data || [])
    } catch (error) {
      console.error('Error loading candidates:', error)
    }
  }

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_courses')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const loadCohorts = async () => {
    try {
      // First update cohort statuses automatically
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

  const filterRecords = () => {
    let filtered = [...trainingRecords]

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterCohort === 'active') {
      filtered = filtered.filter(record => record.cohorts?.status === 'active')
    } else if (filterCohort !== 'all') {
      filtered = filtered.filter(record => record.cohort_id === filterCohort)
    }

    setFilteredRecords(filtered)
  }

  const getFlagshipTitle = () => {
    if (filterCohort === 'active') {
      const activeCohort = cohorts.find(c => c.status === 'active')
      return activeCohort ? `Cohort ${getRomanNumeral(activeCohort.cohort_number)}` : 'Flagship Programs'
    } else if (filterCohort !== 'all') {
      const selectedCohort = cohorts.find(c => c.id === filterCohort)
      return selectedCohort ? `Cohort ${getRomanNumeral(selectedCohort.cohort_number)}` : 'Flagship Programs'
    }
    return 'All Cohorts'
  }

  const flagshipRecords = filteredRecords.filter(record => 
    record.course === 'Professional House Manager Training Program' || 
    record.course === 'Professional Nanny Training Program'
  )
  
  const specializedRecords = filteredRecords.filter(record => 
    record.course !== 'Professional House Manager Training Program' && 
    record.course !== 'Professional Nanny Training Program'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload = {
        candidate_id: formData.candidate_id || null,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        role: formData.role || null,
        status: formData.status,
        course: formData.course || null,
        cohort_id: formData.cohort_id || null,
        training_type: formData.training_type,
        accommodation_type: formData.accommodation_type || null,
        enrolled_courses: formData.enrolled_courses.length > 0 ? formData.enrolled_courses : null,
        updated_by: staff?.name || user?.email || 'Unknown'
      }

      if (selectedRecord) {
        // Update existing record
        const { error } = await supabase
          .from('niche_training')
          .update(payload)
          .eq('id', selectedRecord.id)

        if (error) throw error

        // Log activity
        await ActivityLogger.logEdit(
          user?.id || '',
          'niche_training',
          selectedRecord.id,
          selectedRecord.name,
          staff?.name || user?.email || 'Unknown'
        )

        showToast('Training record updated successfully', 'success')
      } else {
        // Create new record
        const { error } = await supabase
          .from('niche_training')
          .insert({
            ...payload,
            created_by: staff?.name || user?.email || 'Unknown'
          })

        if (error) throw error

        // Log activity
        await ActivityLogger.logCreate(
          user?.id || '',
          'niche_training',
          '',
          formData.name,
          staff?.name || user?.email || 'Unknown'
        )

        showToast('Training record created successfully', 'success')
      }

      setShowModal(false)
      resetForm()
      loadTrainingRecords()
    } catch (error: any) {
      console.error('Error saving training record:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      candidate_id: '',
      name: '',
      phone: '',
      email: '',
      role: '',
      status: 'Pending',
      course: '',
      cohort_id: '',
      training_type: '2week',
      accommodation_type: '',
      enrolled_courses: []
    })
    setSelectedRecord(null)
    setCandidateSearch('')
  }

  const handleEdit = (record: NicheTraining) => {
    setSelectedRecord(record)
    setFormData({
      candidate_id: record.candidate_id || '',
      name: record.name,
      phone: record.phone || '',
      role: record.role || '',
      status: record.status,
      course: record.course || '',
      cohort_id: record.cohort_id || '',
      training_type: (record as any).training_type || '2week',
      accommodation_type: (record as any).accommodation_type || '',
      enrolled_courses: (record as any).enrolled_courses || [record.course].filter(Boolean)
    })
    setCandidateSearch(record.name)
    setShowModal(true)
  }

  const handleDelete = async (record: NicheTraining) => {
    if (!confirm(`Are you sure you want to delete ${record.name} and all their records? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete trainee grades first (if any)
      await supabase
        .from('trainee_grades')
        .delete()
        .eq('trainee_id', record.id)

      // Delete the training record (candidate will be preserved due to CASCADE settings)
      const { error } = await supabase
        .from('niche_training')
        .delete()
        .eq('id', record.id)

      if (error) throw error

      // Log activity
      await ActivityLogger.logDelete(
        user?.id || '',
        'niche_training',
        record.id,
        record.name,
        staff?.name || user?.email || 'Unknown'
      )

      showToast(`${record.name} deleted successfully`, 'success')
      loadTrainingRecords()
    } catch (error: any) {
      console.error('Error deleting training record:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleCandidateSelect = (candidate: Candidate) => {
    setFormData({
      ...formData,
      candidate_id: candidate.id,
      name: candidate.name,
      phone: candidate.phone,
      role: candidate.role
    })
    setCandidateSearch(candidate.name)
    setShowCandidateDropdown(false)
  }

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(candidateSearch.toLowerCase())
  )

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

  const createNextCohorts = async () => {
    try {
      // Update existing cohort statuses first
      await supabase.rpc('update_cohort_statuses')
      
      // Create 5 new cohorts
      const { data, error } = await supabase.rpc('create_next_cohorts', { num_cohorts: 5 })
      
      if (error) throw error
      
      showToast(`Created ${data?.length || 5} new cohorts successfully`, 'success')
      loadCohorts() // Reload cohorts
    } catch (error: any) {
      console.error('Error creating cohorts:', error)
      showToast(`Error: ${error?.message || 'Failed to create cohorts'}`, 'error')
    }
  }

  const handleImportTrainees = async () => {
    if (selectedCandidates.length === 0) {
      showToast('Please select at least one candidate', 'error')
      return
    }

    try {
      const candidatesToImport = candidates.filter(c => selectedCandidates.includes(c.id))
      
      const trainingRecords = candidatesToImport.map(candidate => ({
        candidate_id: candidate.id,
        name: candidate.name,
        phone: candidate.phone,
        role: candidate.role,
        status: 'Pending' as const,
        created_by: staff?.name || user?.email || 'Unknown',
        updated_by: staff?.name || user?.email || 'Unknown'
      }))

      const { error } = await supabase
        .from('niche_training')
        .insert(trainingRecords)

      if (error) throw error

      // Log activity for each imported trainee
      for (const candidate of candidatesToImport) {
        await ActivityLogger.logCreate(
          user?.id || '',
          'niche_training',
          '',
          `Imported ${candidate.name} as trainee`,
          staff?.name || user?.email || 'Unknown'
        )
      }

      showToast(`Successfully imported ${selectedCandidates.length} trainee(s)`, 'success')
      setShowImportModal(false)
      setSelectedCandidates([])
      loadTrainingRecords()
    } catch (error: any) {
      console.error('Error importing trainees:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    )
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedRecords.length === 0) return

    try {
      const { error } = await supabase
        .from('niche_training')
        .update({ 
          status: bulkStatus as 'Pending' | 'Active' | 'Graduated' | 'Expelled',
          updated_by: staff?.name || user?.email || 'Unknown'
        })
        .in('id', selectedRecords)

      if (error) throw error

      showToast(`Updated ${selectedRecords.length} trainee(s) to ${bulkStatus}`, 'success')
      setSelectedRecords([])
      setBulkStatus('')
      loadTrainingRecords()
    } catch (error: any) {
      console.error('Error updating status:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
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
          <h1 className="text-2xl font-bold text-gray-900">NICHE Training</h1>
          <p className="text-gray-600">Manage specialized training programs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Import Trainee
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trainee
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name, course, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
          
          <select
            value={filterCohort}
            onChange={(e) => setFilterCohort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">All Cohorts</option>
            {getVisibleCohorts().map(cohort => {
              const isActive = cohort.status === 'active'
              return (
                <option key={cohort.id} value={isActive ? 'active' : cohort.id}>
                  Cohort {getRomanNumeral(cohort.cohort_number)}{isActive ? ' (active)' : ''}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {/* Flagship Programs Section */}
      {flagshipRecords.length > 0 && (
        <div className="mb-10">
          <div className="rounded-t-lg p-4" style={{ backgroundColor: '#ae491e' }}>
            <h2 className="text-xl font-bold text-white flex items-center">
              <div className="w-2 h-8 bg-white rounded mr-3"></div>
              {getFlagshipTitle()}
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {flagshipRecords.length} trainees
              </span>
            </h2>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === flagshipRecords.length && flagshipRecords.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords(flagshipRecords.map(r => r.id))
                          } else {
                            setSelectedRecords([])
                          }
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cohort</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {flagshipRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => {
                            if (selectedRecords.includes(record.id)) {
                              setSelectedRecords(prev => prev.filter(id => id !== record.id))
                            } else {
                              setSelectedRecords(prev => [...prev, record.id])
                            }
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 flex items-center">
                          {record.name}
                          {record.has_grade && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Graded
                            </span>
                          )}
                        </div>
                        {record.phone && <div className="text-xs text-gray-500">{record.phone}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.role || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={record.status} type="training" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{record.course || 'Not assigned'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {record.cohorts ? `${getRomanNumeral(record.cohorts.cohort_number)}` : 'No cohort'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-nestalk-primary hover:text-nestalk-primary/80 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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

      {selectedRecords.length > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-800">
              {selectedRecords.length} trainee(s) selected
            </span>
            <div className="flex items-center gap-3">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-1 border border-orange-300 rounded text-sm"
              >
                <option value="">Select status</option>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Graduated">Graduated</option>
                <option value="Expelled">Expelled</option>
              </select>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-300"
              >
                Update Status
              </button>
              <button
                onClick={() => setSelectedRecords([])}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specialized Courses Section */}
      {specializedRecords.length > 0 && (
        <div className="mb-8">
          <div className="rounded-t-lg p-4" style={{ backgroundColor: '#ae491e' }}>
            <h2 className="text-xl font-bold text-white flex items-center">
              <div className="w-2 h-8 bg-white rounded mr-3"></div>
              Specialized Skills Training
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {specializedRecords.length} trainees
              </span>
            </h2>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {specializedRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 flex items-center">
                          {record.name}
                          {record.has_grade && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Graded
                            </span>
                          )}
                        </div>
                        {record.phone && <div className="text-xs text-gray-500">{record.phone}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.role || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={record.status} type="training" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{record.course || 'Not assigned'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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

      {(flagshipRecords.length === 0 && specializedRecords.length === 0) && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No training records found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first training record.'}
          </p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Import Trainees from Candidates
              </h2>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                />
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates(filteredCandidates.map(c => c.id))
                            } else {
                              setSelectedCandidates([])
                            }
                          }}
                          className="rounded border-gray-300 text-nestalk-primary focus:ring-nestalk-primary"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate.id)}
                            onChange={() => toggleCandidateSelection(candidate.id)}
                            className="rounded border-gray-300 text-nestalk-primary focus:ring-nestalk-primary"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{candidate.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{candidate.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{candidate.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCandidates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No candidates found matching your search.
                </div>
              )}

              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-600">
                  {selectedCandidates.length} candidate(s) selected
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false)
                      setSelectedCandidates([])
                      setCandidateSearch('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportTrainees}
                    disabled={selectedCandidates.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Import {selectedCandidates.length} Trainee(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedRecord ? 'Edit Training Record' : 'Add Training Record'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      >
                        <option value="">Select role</option>
                        <option value="Nanny">Nanny</option>
                        <option value="House Manager">House Manager</option>
                        <option value="Chef">Chef</option>
                        <option value="Driver">Driver</option>
                        <option value="Night Nurse">Night Nurse</option>
                        <option value="Caregiver">Caregiver</option>
                        <option value="Housekeeper">Housekeeper</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Type *</label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="course_type"
                          value="2week"
                          checked={formData.training_type === '2week'}
                          onChange={() => setFormData({ ...formData, training_type: '2week', enrolled_courses: [] })}
                          className="mr-2 text-nestalk-primary focus:ring-nestalk-primary"
                        />
                        2 Week Programs
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="course_type"
                          value="skills"
                          checked={formData.training_type === 'weekend'}
                          onChange={() => setFormData({ ...formData, training_type: 'weekend', enrolled_courses: [] })}
                          className="mr-2 text-purple-600 focus:ring-purple-600"
                        />
                        Skills Training
                      </label>
                    </div>
                  </div>

                  {formData.training_type === '2week' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Course *</label>
                      <div className="space-y-2">
                        {courses.filter(course => course.name.includes('Professional')).map(course => (
                          <label key={course.id} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="flagship_course"
                              checked={formData.enrolled_courses.includes(course.name)}
                              onChange={() => setFormData({ 
                                ...formData, 
                                enrolled_courses: [course.name],
                                course: course.name
                              })}
                              className="text-nestalk-primary focus:ring-nestalk-primary"
                            />
                            <span className="text-sm text-gray-700">{course.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.training_type === 'weekend' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Skills *</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {courses.filter(course => !course.name.includes('Professional')).map(course => (
                          <label key={course.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.enrolled_courses.includes(course.name)}
                              onChange={(e) => {
                                let newCourses = [...formData.enrolled_courses]
                                if (e.target.checked) {
                                  newCourses = [...newCourses, course.name]
                                } else {
                                  newCourses = newCourses.filter(c => c !== course.name)
                                }
                                setFormData({ 
                                  ...formData, 
                                  enrolled_courses: newCourses,
                                  course: newCourses[0] || ''
                                })
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                            />
                            <span className="text-sm text-gray-700">{course.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.training_type === '2week' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation *</label>
                        <select
                          required
                          value={formData.accommodation_type}
                          onChange={(e) => setFormData({ ...formData, accommodation_type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select accommodation</option>
                          <option value="live_in">Live In</option>
                          <option value="live_out">Live Out</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cohort *</label>
                        <select
                          required
                          value={formData.cohort_id}
                          onChange={(e) => setFormData({ ...formData, cohort_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select cohort</option>
                          {cohorts.map(cohort => (
                            <option key={cohort.id} value={cohort.id}>
                              Cohort {getRomanNumeral(cohort.cohort_number)} ({new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()}) - {cohort.status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Graduated">Graduated</option>
                      <option value="Expelled">Expelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                  >
                    {selectedRecord ? 'Update' : 'Create'} Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}