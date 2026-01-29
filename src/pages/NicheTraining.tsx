import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Edit, Users, UserPlus } from 'lucide-react'
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

interface NicheTraining {
  id: string
  candidate_id?: string
  name: string
  phone?: string
  role?: string
  status: 'Pending' | 'Active' | 'Suspended' | 'Expelled'
  course?: string
  description?: string
  date_started?: string
  date_completed?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<NicheTraining | null>(null)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [formData, setFormData] = useState({
    candidate_id: '',
    name: '',
    phone: '',
    role: '',
    status: 'Pending' as 'Pending' | 'Active' | 'Suspended' | 'Expelled',
    course: '',
    description: '',
    date_started: '',
    date_completed: '',
    notes: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['all', 'Pending', 'Active', 'Suspended', 'Expelled']

  useEffect(() => {
    loadTrainingRecords()
    loadCandidates()
    loadCourses()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [trainingRecords, searchTerm, filterStatus])

  const loadTrainingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_training')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrainingRecords(data || [])
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

  const filterRecords = () => {
    let filtered = [...trainingRecords]

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus)
    }

    setFilteredRecords(filtered)
  }

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
        description: formData.description.trim() || null,
        date_started: formData.date_started || null,
        date_completed: formData.date_completed || null,
        notes: formData.notes.trim() || null,
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
      role: '',
      status: 'Pending',
      course: '',
      description: '',
      date_started: '',
      date_completed: '',
      notes: ''
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
      description: record.description || '',
      date_started: record.date_started || '',
      date_completed: record.date_completed || '',
      notes: record.notes || ''
    })
    setCandidateSearch(record.name)
    setShowModal(true)
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

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
        placeholder="Search by name, course, or role..."
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.name}</div>
                    {record.phone && <div className="text-sm text-gray-500">{record.phone}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.role || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={record.status} type="training" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.course || 'Not assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-nestalk-primary hover:text-nestalk-primary/80"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No training records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first training record.'}
            </p>
          </div>
        )}
      </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Expelled">Expelled</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    >
                      <option value="">Select course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.name}>{course.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Started</label>
                    <input
                      type="date"
                      value={formData.date_started}
                      onChange={(e) => setFormData({ ...formData, date_started: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Completed</label>
                    <input
                      type="date"
                      value={formData.date_completed}
                      onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      placeholder="Training description or objectives..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      placeholder="Additional notes..."
                    />
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
  )
}