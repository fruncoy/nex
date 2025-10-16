import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Users, Phone, Calendar, Edit, CheckCircle, Clock, Upload, Eye, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'


interface Candidate {
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
  live_arrangement?: string
  work_schedule?: string
  employment_type?: string
  expected_salary?: number
  age?: number
  place_of_birth?: string
  next_of_kin_1_phone?: string
  next_of_kin_1_name?: string
  next_of_kin_1_location?: string
  next_of_kin_2_phone?: string
  next_of_kin_2_name?: string
  next_of_kin_2_location?: string
  referee_1_phone?: string
  referee_1_name?: string
  referee_2_phone?: string
  referee_2_name?: string
  address?: string
  apartment?: string
  total_years_experience?: number
  has_good_conduct_cert?: boolean
  good_conduct_cert_receipt?: string
}

export function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    role: '',
    status: 'PENDING' as 'PENDING' | 'INTERVIEW_SCHEDULED' | 'Lost, No Response' | 'Lost, Personality' | 'Lost, Salary' | 'Lost, Experience' | 'Lost, No Good Conduct',
    scheduledDateOnly: '',
    live_arrangement: '',
    work_schedule: '',
    employment_type: '',
    expected_salary: '',
    age: '',
    place_of_birth: '',
    next_of_kin_1_phone: '',
    next_of_kin_1_name: '',
    next_of_kin_1_location: '',
    next_of_kin_2_phone: '',
    next_of_kin_2_name: '',
    next_of_kin_2_location: '',
    referee_1_phone: '',
    referee_1_name: '',
    referee_2_phone: '',
    referee_2_name: '',
    address: '',
    apartment: '',
    total_years_experience: '',
    has_good_conduct_cert: false,
    good_conduct_cert_receipt: ''
  })
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState<Candidate | null>(null)
  const [candidateNotes, setCandidateNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [showExtendedFields, setShowExtendedFields] = useState(false)
  const [addedByFilter, setAddedByFilter] = useState('all')
  const [addedByOptions, setAddedByOptions] = useState<string[]>([])
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; candidate: Candidate | null; dateOnly: string }>({ open: false, candidate: null, dateOnly: '' })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['PENDING', 'INTERVIEW_SCHEDULED', 'WON', 'Lost, No Response', 'Lost, Personality', 'Lost, Salary', 'Lost, Experience', 'Lost, No Good Conduct', 'BLACKLISTED']
  const filterStatusOptions = ['Pending', 'Won', 'Lost', 'Blacklisted', 'Added by System', 'Self']
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']

  useEffect(() => {
    loadCandidates()
    loadNoteCounts()
    loadAddedByOptions()
  }, [])

  useEffect(() => {
    if (candidates.length > 0) {
      loadUnreadCounts()
    }
  }, [candidates, staff?.name])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, filterStatus, addedByFilter, dateRange])

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .neq('status', 'ARCHIVED')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates(data || [])
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAddedByOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('added_by')
        .not('added_by', 'is', null)
      
      if (error) throw error
      
      const uniqueAddedBy = [...new Set(data?.map(item => item.added_by).filter(Boolean))]
      setAddedByOptions(uniqueAddedBy)
    } catch (error) {
      console.error('Error loading added by options:', error)
    }
  }

  const loadNoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .select('candidate_id')
      
      if (error) throw error
      
      const counts: Record<string, number> = {}
      data?.forEach(note => {
        counts[note.candidate_id] = (counts[note.candidate_id] || 0) + 1
      })
      
      setNoteCounts(counts)
    } catch (error) {
      console.error('Error loading note counts:', error)
    }
  }

  const loadUnreadCounts = async () => {
    if (!staff?.name) return
    
    const counts: Record<string, number> = {}
    const totalCounts: Record<string, number> = {}
    
    for (const candidate of candidates) {
      // Count unread notes manually
      const { data: notes } = await supabase
        .from('candidate_notes')
        .select('read_by')
        .eq('candidate_id', candidate.id)
      
      const unreadCount = notes?.filter(note => {
        const readBy = note.read_by || {}
        return !readBy[staff.name]
      }).length || 0
      
      counts[candidate.id] = unreadCount
      totalCounts[candidate.id] = notes?.length || 0
    }
    
    setUnreadCounts(counts)
    setNoteCounts(totalCounts)
  }

  const filterCandidates = () => {
    let filtered = [...candidates]

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm) ||
        candidate.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'Pending') {
        filtered = filtered.filter(candidate => candidate.status === 'PENDING' || candidate.status === 'INTERVIEW_SCHEDULED')
      } else if (filterStatus === 'Won') {
        filtered = filtered.filter(candidate => candidate.status === 'WON')
      } else if (filterStatus === 'Lost') {
        filtered = filtered.filter(candidate => candidate.status.startsWith('Lost,'))
      } else if (filterStatus === 'Blacklisted') {
        filtered = filtered.filter(candidate => candidate.status === 'BLACKLISTED')
      } else if (filterStatus === 'Added by System') {
        filtered = filtered.filter(candidate => candidate.added_by === 'admin' || candidate.added_by === 'System')
      } else if (filterStatus === 'Self') {
        filtered = filtered.filter(candidate => candidate.added_by === 'self')
      }
    }

    if (addedByFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.added_by === addedByFilter)
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(c => {
        const d = new Date(c.created_at).toISOString().split('T')[0]
        return d >= dateRange.start && d <= dateRange.end
      })
    }

    setFilteredCandidates(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        source: formData.source || 'Referral',
        role: formData.role,
        status: formData.status,
        live_arrangement: formData.live_arrangement || null,
        work_schedule: formData.work_schedule || null,
        employment_type: formData.employment_type || null,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
        age: formData.age ? parseInt(formData.age) : null,
        place_of_birth: formData.place_of_birth || null,
        next_of_kin_1_phone: formData.next_of_kin_1_phone || null,
        next_of_kin_1_name: formData.next_of_kin_1_name || null,
        next_of_kin_1_location: formData.next_of_kin_1_location || null,
        next_of_kin_2_phone: formData.next_of_kin_2_phone || null,
        next_of_kin_2_name: formData.next_of_kin_2_name || null,
        next_of_kin_2_location: formData.next_of_kin_2_location || null,
        referee_1_phone: formData.referee_1_phone || null,
        referee_1_name: formData.referee_1_name || null,
        referee_2_phone: formData.referee_2_phone || null,
        referee_2_name: formData.referee_2_name || null,
        total_years_experience: formData.total_years_experience ? parseInt(formData.total_years_experience) : null,
        has_good_conduct_cert: formData.has_good_conduct_cert,
        good_conduct_cert_receipt: formData.good_conduct_cert_receipt || null,
        address: formData.address || null,
        apartment: formData.apartment || null
      }
      
      if (selectedCandidate) {
        // Update existing candidate
        const { error } = await supabase
          .from('candidates')
          .update(payload)
          .eq('id', selectedCandidate.id)
        if (error) throw error
        
        // Log candidate edit
        if (user?.id && staff?.name) {
          await ActivityLogger.logEdit(user.id, 'candidate', selectedCandidate.id, selectedCandidate.name, staff.name)
        }
        
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c))
      } else {
        // Add new candidate
        const insertPayload = {
          ...payload,
          inquiry_date: new Date().toISOString().split('T')[0],
          assigned_to: user?.id,
          added_by: 'System'
        }
        
        const { data, error } = await supabase.from('candidates').insert(insertPayload).select('*').single()
        if (error) throw error
        
        // Log candidate creation
        if (user?.id && staff?.name) {
          await ActivityLogger.logCreate(user.id, 'candidate', data.id, data.name, staff.name)
        }
        
        setCandidates(prev => [data, ...prev])
      }
      
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving candidate:', error)
      if (error?.code === '23505' || error?.message?.includes('duplicate key value violates unique constraint')) {
        alert('A candidate with this phone number already exists')
      } else {
        alert(`Error saving candidate: ${error?.message || 'Unknown error'}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewNotes = async (candidate: Candidate) => {
    setSelectedCandidateForNotes(candidate)
    setShowNotesModal(true)
    setCandidateNotes([])
    
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCandidateNotes(data || [])
      
      if (staff?.name && data?.length > 0) {
        for (const note of data) {
          const currentReadBy = note.read_by || {}
          const updatedReadBy = { ...currentReadBy, [staff.name]: new Date().toISOString() }
          
          await supabase
            .from('candidate_notes')
            .update({ read_by: updatedReadBy })
            .eq('id', note.id)
        }
        
        setUnreadCounts(prev => ({ ...prev, [candidate.id]: 0 }))
      }
    } catch (error) {
      console.error('Error in handleViewNotes:', error)
      setCandidateNotes([])
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCandidateForNotes) return
    
    try {
      const { error } = await supabase
        .from('candidate_notes')
        .insert({
          candidate_id: selectedCandidateForNotes.id,
          note: newNote.trim(),
          created_by: staff?.name || user?.email || 'Unknown'
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewNotes(selectedCandidateForNotes)
      await loadUnreadCounts()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th'
    return `${day}${suffix} ${month} ${year}`
  }

  const downloadTemplate = () => {
    const headers = ['name', 'phone', 'source', 'role', 'status']
    const sampleData = [
      'Jane Doe,+254712345678,TikTok,Nanny,PENDING',
      'John Smith,+254723456789,Facebook,Driver,PENDING'
    ]
    
    const validValues = [
      '# Valid roles: ' + roleOptions.join(', '),
      '# Valid sources: ' + sourceOptions.join(', '),
      '# Valid statuses: ' + statusOptions.join(', ')
    ]
    
    const csvContent = [validValues.join('\n'), headers.join(','), ...sampleData].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'candidates_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      alert('Please select a CSV file to upload')
      return
    }

    try {
      const text = await uploadFile.text()
      const rows = text.split(/\r?\n/).filter(row => row.trim())
      
      if (rows.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        return
      }

      const header = rows[0]
      const dataRows = rows.slice(1)
      
      const inserts: any[] = []
      const errors: string[] = []
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        if (!row.trim()) continue
        
        const parts = row.split(',')
        const name = parts[0]?.trim()
        const phone = parts[1]?.trim()
        let source = (parts[2]?.trim() || 'Referral')
        let role = (parts[3]?.trim() || 'Caregiver')
        let status = (parts[4]?.trim() || 'PENDING')
        
        // Ensure no empty strings
        if (!source) source = 'Referral'
        if (!role) role = 'Caregiver'
        if (!status) status = 'PENDING'

        if (!name || !phone) {
          errors.push(`Row ${i + 2}: Missing name or phone`)
          continue
        }
        
        // Check for duplicate phone number
        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('id')
          .eq('phone', phone)
          .single()
        
        if (existingCandidate) {
          errors.push(`Row ${i + 2}: Phone number ${phone} already exists`)
          continue
        }

        // Map and validate role (case-insensitive)
        const roleMap: Record<string, string> = {
          'chef': 'Chef',
          'nurse': 'Night Nurse',
          'housekeeping': 'Housekeeper',
          'housekeeper': 'Housekeeper',
          'nanny': 'Nanny',
          'driver': 'Driver',
          'caregiver': 'Caregiver',
          'house manager': 'House Manager',
          'night nurse': 'Night Nurse'
        }
        
        const mappedRole = roleMap[role.toLowerCase()]
        if (mappedRole) {
          role = mappedRole
        } else if (!roleOptions.includes(role)) {
          errors.push(`Row ${i + 2}: Invalid role '${role}'. Using 'Caregiver' instead.`)
          role = 'Caregiver'
        }
        


        // Map and validate source (case-insensitive)
        const sourceMap: Record<string, string> = {
          'tiktok': 'TikTok',
          'facebook': 'Facebook',
          'instagram': 'Instagram',
          'google search': 'Google Search',
          'website': 'Website',
          'referral': 'Referral',
          'linkedin': 'LinkedIn',
          'walk-in poster': 'Walk-in poster',
          'youtube': 'Youtube'
        }
        
        const mappedSource = sourceMap[source.toLowerCase()]
        if (mappedSource) {
          source = mappedSource
        } else if (!sourceOptions.includes(source)) {
          errors.push(`Row ${i + 2}: Invalid source '${source}'. Using 'Referral' instead.`)
          source = 'Referral'
        }

        // Validate and fix status
        if (!statusOptions.includes(status)) {
          errors.push(`Row ${i + 2}: Invalid status '${status}'. Using 'PENDING' instead.`)
          status = 'PENDING'
        }

        inserts.push({ 
          name, 
          phone, 
          source,
          role, 
          status, 
          assigned_to: user?.id, 
          inquiry_date: new Date().toISOString().split('T')[0],
          added_by: 'System'
        })
      }

      if (inserts.length === 0) {
        alert('No valid rows to insert. Please check your CSV data.')
        return
      }

      if (errors.length > 0) {
        const proceed = confirm(`Found ${errors.length} validation issues:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more' : ''}\n\nProceed with corrected values?`)
        if (!proceed) return
      }

      const { error } = await supabase.from('candidates').insert(inserts)
      if (error) throw error

      // Log bulk upload activity
      if (user?.id && staff?.name) {
        await ActivityLogger.logBulkUpload(user.id, 'candidate', inserts.length, staff.name)
      }

      await loadCandidates()
      setShowBulkUpload(false)
      setUploadFile(null)
      alert(`Successfully uploaded ${inserts.length} candidates${errors.length > 0 ? ` with ${errors.length} corrections` : ''}`)
    } catch (error) {
      console.error('Error bulk uploading candidates:', error)
      alert(`Error uploading candidates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', phone: '', source: '', role: '', status: 'PENDING', scheduledDateOnly: '',
      live_arrangement: '', work_schedule: '', employment_type: '', expected_salary: '',
      age: '', place_of_birth: '', next_of_kin_1_phone: '', next_of_kin_1_name: '',
      next_of_kin_1_location: '', next_of_kin_2_phone: '', next_of_kin_2_name: '',
      next_of_kin_2_location: '', referee_1_phone: '', referee_1_name: '',
      referee_2_phone: '', referee_2_name: '', address: '',
      apartment: '', total_years_experience: '', has_good_conduct_cert: false,
      good_conduct_cert_receipt: ''
    })
    setSelectedCandidate(null)
    setShowExtendedFields(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600">Track candidate inquiries and outreach progress</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Bulk Upload"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
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
                      {(unreadCounts[candidate.id] || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {unreadCounts[candidate.id]}
                        </span>
                      )}
                      {(noteCounts[candidate.id] || 0) > 0 && (unreadCounts[candidate.id] || 0) === 0 && (
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
                      <span className="hidden sm:inline-flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                      </span>
                      {candidate.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.source || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.added_by || 'System'}</td>
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
                            source: candidate.source || 'Referral',
                            role: candidate.role,
                            status: candidate.status as any,
                            scheduledDateOnly: '',
                            live_arrangement: candidate.live_arrangement || '',
                            work_schedule: candidate.work_schedule || '',
                            employment_type: candidate.employment_type || '',
                            expected_salary: candidate.expected_salary?.toString() || '',
                            age: candidate.age?.toString() || '',
                            place_of_birth: candidate.place_of_birth || '',
                            next_of_kin_1_phone: candidate.next_of_kin_1_phone || '',
                            next_of_kin_1_name: candidate.next_of_kin_1_name || '',
                            next_of_kin_1_location: candidate.next_of_kin_1_location || '',
                            next_of_kin_2_phone: candidate.next_of_kin_2_phone || '',
                            next_of_kin_2_name: candidate.next_of_kin_2_name || '',
                            next_of_kin_2_location: candidate.next_of_kin_2_location || '',
                            referee_1_phone: candidate.referee_1_phone || '',
                            referee_1_name: candidate.referee_1_name || '',
                            referee_2_phone: candidate.referee_2_phone || '',
                            referee_2_name: candidate.referee_2_name || '',
                            address: candidate.address || '',
                            apartment: candidate.apartment || '',
                            total_years_experience: candidate.total_years_experience?.toString() || '',
                            has_good_conduct_cert: candidate.has_good_conduct_cert || false,
                            good_conduct_cert_receipt: candidate.good_conduct_cert_receipt || ''
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
                          if (newStatus) {
                            // Check if status change is allowed
                            if (candidate.status === 'WON' || candidate.status === 'INTERVIEW_SCHEDULED') {
                              alert('Cannot change status. Use Staff page or Interviews page to modify.')
                              e.target.selectedIndex = 0
                              return
                            }
                            
                            // If setting to INTERVIEW_SCHEDULED, open date picker
                            if (newStatus === 'INTERVIEW_SCHEDULED') {
                              setScheduleModal({ open: true, candidate, dateOnly: '' })
                              e.target.selectedIndex = 0
                              return
                            }
                            
                            try {
                              const oldStatus = candidate.status
                              const { error } = await supabase
                                .from('candidates')
                                .update({ status: newStatus })
                                .eq('id', candidate.id)
                              if (error) throw error
                              
                              setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: newStatus } : c))
                              
                              // Log status change to activity_logs
                              if (user?.id && staff?.name) {
                                try {
                                  await supabase.from('activity_logs').insert({
                                    user_id: user.id,
                                    action_type: 'status_change',
                                    entity_type: 'candidate',
                                    entity_id: candidate.id,
                                    entity_name: candidate.name,
                                    old_value: oldStatus,
                                    new_value: newStatus,
                                    description: `${staff.name} changed ${candidate.name} status from ${oldStatus} to ${newStatus}`
                                  })
                                } catch (logError) {
                                  console.error('Error logging status change:', logError)
                                }
                              }
                            } catch (error: any) {
                              console.error('Error updating status:', error)
                              alert(`Error updating status: ${error?.message || 'Unknown error'}`)
                            }
                          }
                          e.target.selectedIndex = 0
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                        defaultValue=""
                      >
                        <option value="" disabled>Update Status</option>
                        {statusOptions.map(status => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={candidate.status} type="candidate" />
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first candidate inquiry.'
            }
          </p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowModal(false); resetForm() }}>
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedCandidate ? 'Edit Candidate' : 'Add New Candidate'}
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
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowExtendedFields(!showExtendedFields)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Extended Fields (Optional)</span>
                    <span>{showExtendedFields ? '−' : '+'}</span>
                  </button>
                </div>

                {showExtendedFields && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Live Arrangement</label>
                        <select
                          value={formData.live_arrangement}
                          onChange={(e) => setFormData({ ...formData, live_arrangement: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          <option value="Live-In">Live-In</option>
                          <option value="Live-Out">Live-Out</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
                        <select
                          value={formData.work_schedule}
                          onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                        <select
                          value={formData.employment_type}
                          onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          <option value="Permanent">Permanent</option>
                          <option value="Temporary">Temporary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
                        <input
                          type="number"
                          value={formData.expected_salary}
                          onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Years Experience</label>
                        <input
                          type="number"
                          value={formData.total_years_experience}
                          onChange={(e) => setFormData({ ...formData, total_years_experience: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                      <input
                        type="text"
                        value={formData.place_of_birth}
                        onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment</label>
                      <input
                        type="text"
                        value={formData.apartment}
                        onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.has_good_conduct_cert}
                          onChange={(e) => setFormData({ ...formData, has_good_conduct_cert: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Has Valid Good Conduct Certificate</span>
                      </label>
                      {formData.has_good_conduct_cert && (
                        <input
                          type="text"
                          value={formData.good_conduct_cert_receipt}
                          onChange={(e) => setFormData({ ...formData, good_conduct_cert_receipt: e.target.value })}
                          placeholder="Certificate details or receipt number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">Next of Kin</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 1 Name</label>
                          <input
                            type="text"
                            value={formData.next_of_kin_1_name}
                            onChange={(e) => setFormData({ ...formData, next_of_kin_1_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 1 Phone</label>
                          <input
                            type="tel"
                            value={formData.next_of_kin_1_phone}
                            onChange={(e) => setFormData({ ...formData, next_of_kin_1_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 1 Location</label>
                        <input
                          type="text"
                          value={formData.next_of_kin_1_location}
                          onChange={(e) => setFormData({ ...formData, next_of_kin_1_location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 2 Name</label>
                          <input
                            type="text"
                            value={formData.next_of_kin_2_name}
                            onChange={(e) => setFormData({ ...formData, next_of_kin_2_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 2 Phone</label>
                          <input
                            type="tel"
                            value={formData.next_of_kin_2_phone}
                            onChange={(e) => setFormData({ ...formData, next_of_kin_2_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin 2 Location</label>
                        <input
                          type="text"
                          value={formData.next_of_kin_2_location}
                          onChange={(e) => setFormData({ ...formData, next_of_kin_2_location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">References</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Referee 1 Name</label>
                          <input
                            type="text"
                            value={formData.referee_1_name}
                            onChange={(e) => setFormData({ ...formData, referee_1_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Referee 1 Phone</label>
                          <input
                            type="tel"
                            value={formData.referee_1_phone}
                            onChange={(e) => setFormData({ ...formData, referee_1_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Referee 2 Name</label>
                          <input
                            type="text"
                            value={formData.referee_2_name}
                            onChange={(e) => setFormData({ ...formData, referee_2_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Referee 2 Phone</label>
                          <input
                            type="tel"
                            value={formData.referee_2_phone}
                            onChange={(e) => setFormData({ ...formData, referee_2_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Bulk Upload Candidates
                </h2>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Download CSV Template"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkUpload(false)
                      setUploadFile(null)
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                  >
                    Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showNotesModal && selectedCandidateForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notes for {selectedCandidateForNotes.name} ({noteCounts[selectedCandidateForNotes.id] || 0} notes)
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
      {scheduleModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule Interview for {scheduleModal.candidate?.name}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interview Date (Time will be set to 2:00 PM)
                  </label>
                  <input
                    type="date"
                    value={scheduleModal.dateOnly}
                    onChange={(e) => setScheduleModal(prev => ({ ...prev, dateOnly: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setScheduleModal({ open: false, candidate: null, dateOnly: '' })}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!scheduleModal.dateOnly || !scheduleModal.candidate) return
                      
                      try {
                        const date = new Date(scheduleModal.dateOnly)
                        date.setHours(14, 0, 0, 0) // Set to 2:00 PM
                        const isoDateTime = date.toISOString()
                        
                        // Create interview
                        const { error: interviewError } = await supabase
                          .from('interviews')
                          .insert({
                            candidate_id: scheduleModal.candidate.id,
                            date_time: isoDateTime,
                            location: 'Office',
                            assigned_staff: user?.id,
                            attended: false,
                            outcome: null,
                            status: 'scheduled'
                          })
                        if (interviewError) throw interviewError
                        
                        // Update candidate status
                        const { error: candidateError } = await supabase
                          .from('candidates')
                          .update({ 
                            status: 'INTERVIEW_SCHEDULED',
                            scheduled_date: isoDateTime
                          })
                          .eq('id', scheduleModal.candidate.id)
                        if (candidateError) throw candidateError
                        
                        setCandidates(prev => prev.map(c => 
                          c.id === scheduleModal.candidate?.id 
                            ? { ...c, status: 'INTERVIEW_SCHEDULED', scheduled_date: isoDateTime } 
                            : c
                        ))
                        
                        setScheduleModal({ open: false, candidate: null, dateOnly: '' })
                        alert('Interview scheduled successfully')
                      } catch (error: any) {
                        console.error('Error scheduling interview:', error)
                        alert(`Error scheduling interview: ${error?.message || 'Unknown error'}`)
                      }
                    }}
                    disabled={!scheduleModal.dateOnly}
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50"
                  >
                    Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}