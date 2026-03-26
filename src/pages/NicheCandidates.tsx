import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PhoneInput } from '../components/ui/PhoneInput'
import { Plus, Users, Phone, Calendar, Edit, CheckCircle, Clock, Upload, Eye, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'
import * as XLSX from 'xlsx'

interface NicheCandidate {
  id: string
  name: string
  phone: string
  source?: string
  role: string
  inquiry_date: string
  status: string
  scheduled_date: string | null
  assigned_to: string | null
  created_at: string
  added_by?: string
  age?: number
  email?: string
  qualification_score?: number
  qualification_notes?: string
}

export function NicheCandidates() {
  const [candidates, setCandidates] = useState<NicheCandidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<NicheCandidate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ 
    start: '2025-02-01', 
    end: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<NicheCandidate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    role: '',
    inquiry_date: '',
    status: 'New Inquiry' as 'New Inquiry' | 'Interview Scheduled' | 'Lost - No Show Interview' | 'Lost - Failed Interview' | 'Lost - Age' | 'Lost - No References' | 'Lost - No Response' | 'Lost - Good Conduct' | 'Lost - Experience' | 'Pending Outcome' | 'Qualified' | 'Active in Training' | 'Graduated' | 'BLACKLISTED',
    scheduledDateOnly: '',
    age: '',
    email: '',
    qualification_notes: '',
    category: '2-Week Flagship' as 'Short Course' | '2-Week Flagship'
  })
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState<NicheCandidate | null>(null)
  const [candidateNotes, setCandidateNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; candidate: NicheCandidate | null; dateOnly: string }>({ open: false, candidate: null, dateOnly: '' })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['New Inquiry', 'Interview Scheduled', 'Lost - No Show Interview', 'Lost - Failed Interview', 'Lost - Age', 'Lost - No References', 'Lost - No Response', 'Lost - Good Conduct', 'Lost - Experience', 'Pending Outcome', 'Qualified', 'Active in Training', 'Graduated', 'BLACKLISTED']
  const filterStatusOptions = ['all', 'New Inquiry', 'Interview Scheduled', 'All Lost', 'Pending Outcome', 'Qualified', 'Active in Training', 'Graduated', 'BLACKLISTED']
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube', 'Referred By Church']

  useEffect(() => {
    loadCandidates()
    loadNoteCounts()
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, filterStatus, sourceFilter, categoryFilter, dateRange])

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('niche_candidates')
        .select('*')
        .order('inquiry_date', { ascending: false })
        .limit(500)

      if (error) throw error
      setCandidates(data || [])
    } catch (error) {
      console.error('Error loading NICHE candidates:', error)
      showToast('Failed to load NICHE candidates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadNoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_candidate_notes')
        .select('niche_candidate_id')
      
      if (error) throw error
      
      const counts: Record<string, number> = {}
      data?.forEach(note => {
        counts[note.niche_candidate_id] = (counts[note.niche_candidate_id] || 0) + 1
      })
      
      setNoteCounts(counts)
    } catch (error) {
      console.error('Error loading note counts:', error)
    }
  }

  const filterCandidates = () => {
    let filtered = [...candidates]

    if (searchTerm) {
      const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '')
      const searchPhone = normalizePhone(searchTerm)
      
      filtered = filtered.filter(candidate => {
        const nameMatch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
        const roleMatch = candidate.role?.toLowerCase().includes(searchTerm.toLowerCase())
        
        let phoneMatch = false
        if (searchPhone) {
          const candidatePhone = normalizePhone(candidate.phone)
          phoneMatch = candidatePhone.includes(searchPhone)
        }
        
        return nameMatch || phoneMatch || roleMatch
      })
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'New Inquiry') {
        filtered = filtered.filter(candidate => candidate.status === 'New Inquiry')
      } else if (filterStatus === 'Interview Scheduled') {
        filtered = filtered.filter(candidate => candidate.status === 'Interview Scheduled')
      } else if (filterStatus === 'All Lost') {
        filtered = filtered.filter(candidate => candidate.status.startsWith('Lost'))
      } else if (filterStatus === 'Pending Outcome') {
        filtered = filtered.filter(candidate => candidate.status === 'Pending Outcome')
      } else if (filterStatus === 'Qualified') {
        filtered = filtered.filter(candidate => candidate.status === 'Qualified')
      } else if (filterStatus === 'Active in Training') {
        filtered = filtered.filter(candidate => candidate.status === 'Active in Training')
      } else if (filterStatus === 'Graduated') {
        filtered = filtered.filter(candidate => candidate.status === 'Graduated')
      } else if (filterStatus === 'BLACKLISTED') {
        filtered = filtered.filter(candidate => candidate.status === 'BLACKLISTED')
      }
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.source === sourceFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(candidate => (candidate as any).category === categoryFilter)
    }

    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(c => {
        const d = c.inquiry_date
        if (dateRange.start && dateRange.end) {
          return d >= dateRange.start && d <= dateRange.end
        } else if (dateRange.start) {
          return d >= dateRange.start
        } else if (dateRange.end) {
          return d <= dateRange.end
        }
        return true
      })
    }

    setFilteredCandidates(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        source: formData.source || 'Referral',
        role: formData.role,
        status: formData.status,
        age: formData.age ? parseInt(formData.age) : null,
        email: formData.email || null,
        qualification_notes: formData.qualification_notes || null,
        category: formData.category
      }
      
      if (formData.status === 'Interview Scheduled' && formData.scheduledDateOnly) {
        const date = new Date(formData.scheduledDateOnly)
        date.setHours(9, 0, 0, 0)
        payload.scheduled_date = date.toISOString()
      }
      
      if (selectedCandidate) {
        const { error } = await supabase
          .from('niche_candidates')
          .update(payload)
          .eq('id', selectedCandidate.id)
        if (error) throw error
        
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c))
        showToast('NICHE candidate updated successfully', 'success')
      } else {
        const insertPayload = {
          ...payload,
          inquiry_date: formData.inquiry_date || new Date().toISOString().split('T')[0],
          assigned_to: user?.id,
          added_by: staff?.name || 'System'
        }
        
        const { data, error } = await supabase.from('niche_candidates').insert(insertPayload).select('*').single()
        if (error) throw error
        
        setCandidates(prev => [data, ...prev])
        showToast('NICHE candidate added successfully', 'success')
      }
      
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving NICHE candidate:', error)
      if (error?.code === '23505') {
        showToast('Phone number already exists!', 'error')
      } else {
        showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', phone: '', source: '', role: '', inquiry_date: '', status: 'New Inquiry', 
      scheduledDateOnly: '', age: '', email: '', qualification_notes: '', category: '2-Week Flagship'
    })
    setSelectedCandidate(null)
  }

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const handleViewNotes = async (candidate: NicheCandidate) => {
    setSelectedCandidateForNotes(candidate)
    setShowNotesModal(true)
    
    try {
      const { data, error } = await supabase
        .from('niche_candidate_notes')
        .select('*')
        .eq('niche_candidate_id', candidate.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCandidateNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
      setCandidateNotes([])
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCandidateForNotes) return
    
    try {
      const { error } = await supabase
        .from('niche_candidate_notes')
        .insert({
          niche_candidate_id: selectedCandidateForNotes.id,
          note: newNote.trim(),
          created_by: staff?.name || user?.email || 'Unknown'
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewNotes(selectedCandidateForNotes)
      await loadNoteCounts()
    } catch (error) {
      console.error('Error adding note:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">NICHE Candidates</h1>
          <p className="text-gray-600">Track NICHE candidate pipeline from inquiry to graduation</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add NICHE Candidate
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          statusOptions={filterStatusOptions}
          placeholder="Search by name, phone, or role..."
        />
        
        <div className="flex gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">All Sources</option>
            {sourceOptions.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">All Categories</option>
            <option value="2-Week Flagship">2-Week Flagship</option>
            <option value="Short Course">Short Course</option>
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate, index) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative">
                      <button
                        onClick={() => handleViewNotes(candidate)}
                        className="text-nestalk-primary hover:text-nestalk-primary/80"
                        title="View/Add Notes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(noteCounts[candidate.id] || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {noteCounts[candidate.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <Phone className="w-3 h-3 mr-1 inline" />
                      {candidate.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.source || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (candidate as any).category === '2-Week Flagship' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {(candidate as any).category || '2-Week Flagship'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDisplayDate(candidate.inquiry_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowModal(true)
                          setSelectedCandidate(candidate)
                          setFormData({
                            name: candidate.name,
                            phone: candidate.phone,
                            source: candidate.source || '',
                            role: candidate.role,
                            inquiry_date: candidate.inquiry_date,
                            status: candidate.status as any,
                            scheduledDateOnly: candidate.scheduled_date ? new Date(candidate.scheduled_date).toISOString().split('T')[0] : '',
                            age: candidate.age?.toString() || '',
                            email: candidate.email || '',
                            qualification_notes: candidate.qualification_notes || '',
                            category: (candidate as any).category || '2-Week Flagship'
                          })
                        }}
                        className="text-nestalk-primary hover:text-nestalk-primary/80"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <select
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          if (newStatus === 'Schedule Interview') {
                            setScheduleModal({ open: true, candidate, dateOnly: '' })
                          } else if (newStatus) {
                            try {
                              const { error } = await supabase
                                .from('niche_candidates')
                                .update({ status: newStatus })
                                .eq('id', candidate.id)
                              if (error) throw error
                              
                              setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: newStatus } : c))
                              showToast(`Status updated to ${newStatus}`, 'success')
                            } catch (error: any) {
                              showToast(`Error: ${error?.message}`, 'error')
                            }
                          }
                          e.target.selectedIndex = 0
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                        defaultValue=""
                      >
                        <option value="" disabled>Update Status</option>
                        <option value="Schedule Interview">Schedule Interview</option>
                        {statusOptions.filter(s => s !== 'Interview Scheduled').map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={candidate.status} type="niche_candidate" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No NICHE candidates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first NICHE candidate.'}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedCandidate ? 'Edit NICHE Candidate' : 'Add NICHE Candidate'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="">Select source</option>
                    {sourceOptions.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="">Select role</option>
                    {roleOptions.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    <option value="2-Week Flagship">2-Week Flagship</option>
                    <option value="Short Course">Short Course</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
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
                    {selectedCandidate ? 'Update' : 'Add'} Candidate
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedCandidateForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notes for {selectedCandidateForNotes.name}
              </h2>
              
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {candidateNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  candidateNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{note.created_by}</span>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNotesModal(false)
                    setSelectedCandidateForNotes(null)
                    setCandidateNotes([])
                    setNewNote('')
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

      {/* Schedule Interview Modal */}
      {scheduleModal.open && scheduleModal.candidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule Interview for {scheduleModal.candidate.name}
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                <input
                  type="date"
                  value={scheduleModal.dateOnly}
                  onChange={(e) => setScheduleModal(prev => ({ ...prev, dateOnly: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleModal({ open: false, candidate: null, dateOnly: '' })}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!scheduleModal.dateOnly) {
                      showToast('Please select a date', 'error')
                      return
                    }
                    
                    try {
                      const date = new Date(scheduleModal.dateOnly)
                      date.setHours(9, 0, 0, 0)
                      const scheduledDateTime = date.toISOString()
                      
                      // Update candidate status and scheduled date
                      const { error: candidateError } = await supabase
                        .from('niche_candidates')
                        .update({ 
                          status: 'Interview Scheduled',
                          scheduled_date: scheduledDateTime
                        })
                        .eq('id', scheduleModal.candidate!.id)
                      
                      if (candidateError) throw candidateError
                      
                      // Create interview record
                      const { error: interviewError } = await supabase
                        .from('niche_interviews')
                        .insert({
                          niche_candidate_id: scheduleModal.candidate!.id,
                          date_time: scheduledDateTime,
                          assigned_staff: user?.id,
                          attended: false,
                          outcome: null
                        })
                      
                      if (interviewError) throw interviewError
                      
                      setCandidates(prev => prev.map(c => 
                        c.id === scheduleModal.candidate!.id 
                          ? { ...c, status: 'Interview Scheduled', scheduled_date: scheduledDateTime }
                          : c
                      ))
                      
                      showToast('Interview scheduled successfully', 'success')
                      setScheduleModal({ open: false, candidate: null, dateOnly: '' })
                    } catch (error: any) {
                      showToast(`Error: ${error?.message}`, 'error')
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                >
                  Schedule Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}