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
  good_conduct_status?: string
  work_experiences?: string
  kenya_years?: number
  qualification_score?: number
  qualification_notes?: string
  preferred_interview_date?: string
  id_number?: string
  email?: string
  county?: string
  town?: string
  estate?: string
  marital_status?: string
  has_kids?: boolean
  kids_count?: number
  has_parents?: string
  off_day?: string
  has_siblings?: boolean
  dependent_siblings?: number
  education_level?: string
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
    inquiry_date: '',
    status: 'PENDING' as 'PENDING' | 'Pending Review' | 'INTERVIEW_SCHEDULED' | 'Lost - Interview Lost' | 'Lost - Missed Interview' | 'Lost, Age' | 'Lost, No References' | 'Lost, No Response' | 'Lost, Personality' | 'Lost, Salary' | 'Lost, Experience' | 'Lost, No Good Conduct' | 'Pending, applying GC',
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
    good_conduct_cert_receipt: '',
    good_conduct_status: '',
    kenya_years: '',
    qualification_notes: '',
    id_number: '',
    email: '',
    county: '',
    town: '',
    estate: '',
    marital_status: '',
    has_kids: null,
    kids_count: '',
    has_parents: '',
    off_day: '',
    has_siblings: null,
    dependent_siblings: '',
    education_level: ''
  })
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showUploadResults, setShowUploadResults] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Array<{type: 'add' | 'skip' | 'exists' | 'error', name: string, phone: string, message: string, data?: any}>>([])
  const [uploadResults, setUploadResults] = useState<{
    total: number
    added: number
    updated: number
    skipped: number
    errors: string[]
    details: Array<{type: 'added' | 'updated' | 'skipped' | 'error', name: string, message: string}>
  }>({ total: 0, added: 0, updated: 0, skipped: 0, errors: [], details: [] })
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
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; candidate: Candidate | null; dateOnly: string }>({ open: false, candidate: null, dateOnly: '' })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedCandidateForProfile, setSelectedCandidateForProfile] = useState<Candidate | null>(null)

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['PENDING', 'Pending Review', 'Pending, applying GC', 'INTERVIEW_SCHEDULED', 'WON', 'Lost - Interview Lost', 'Lost - Missed Interview', 'Lost, Age', 'Lost, No References', 'Lost, No Response', 'Lost, Personality', 'Lost, Salary', 'Lost, Experience', 'Lost, No Good Conduct', 'BLACKLISTED']
  const filterStatusOptions = ['Pending', 'Won', 'Lost', 'Blacklisted', 'Added by System', 'Self-Registered']
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube', 'Referred By Church']

  useEffect(() => {
    loadCandidates()
    loadNoteCounts()
    loadAddedByOptions()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('candidates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        loadCandidates()
        loadNoteCounts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_notes' }, () => {
        loadNoteCounts()
        loadUnreadCounts()
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (candidates.length > 0) {
      loadUnreadCounts()
    }
  }, [candidates, staff?.name])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, filterStatus, addedByFilter, sourceFilter, dateRange])

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .neq('status', 'ARCHIVED')
        .order('inquiry_date', { ascending: false })

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
      // Normalize phone number for search
      const normalizePhone = (phone: string) => {
        return phone.replace(/[^0-9]/g, '') // Remove all non-digits
      }
      
      const searchPhone = normalizePhone(searchTerm)
      
      filtered = filtered.filter(candidate => {
        const nameMatch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
        const roleMatch = candidate.role.toLowerCase().includes(searchTerm.toLowerCase())
        
        // Phone matching with normalization
        let phoneMatch = false
        if (searchPhone) {
          const candidatePhone = normalizePhone(candidate.phone)
          // Check if search term matches any part of the phone number
          phoneMatch = candidatePhone.includes(searchPhone) ||
                      candidatePhone.endsWith(searchPhone) ||
                      (searchPhone.startsWith('0') && candidatePhone.endsWith(searchPhone.substring(1)))
        }
        
        return nameMatch || phoneMatch || roleMatch
      })
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'Pending') {
        filtered = filtered.filter(candidate => candidate.status === 'PENDING')
      } else if (filterStatus === 'Won') {
        filtered = filtered.filter(candidate => candidate.status === 'WON')
      } else if (filterStatus === 'Lost') {
        filtered = filtered.filter(candidate => candidate.status.startsWith('Lost,') || candidate.status.startsWith('Lost -'))
      } else if (filterStatus === 'Blacklisted') {
        filtered = filtered.filter(candidate => candidate.status === 'BLACKLISTED')
      } else if (filterStatus === 'Added by System') {
        filtered = filtered.filter(candidate => candidate.added_by === 'admin' || candidate.added_by === 'System')
      } else if (filterStatus === 'Self-Registered') {
        filtered = filtered.filter(candidate => candidate.added_by === 'self')
      }
    }

    if (addedByFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.added_by === addedByFilter)
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.source === sourceFilter)
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
    
    // Validate scheduled date if status is INTERVIEW_SCHEDULED
    if (formData.status === 'INTERVIEW_SCHEDULED' && !formData.scheduledDateOnly) {
      alert('Please select a scheduled date for the interview')
      return
    }
    
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
        good_conduct_status: formData.good_conduct_status || null,
        kenya_years: formData.kenya_years ? parseInt(formData.kenya_years) : null,

        qualification_notes: formData.qualification_notes || null,
        qualification_score: (() => {
          const age = parseInt(formData.age) || 0
          const totalExp = parseInt(formData.total_years_experience) || 0
          const kenyaExp = parseInt(formData.kenya_years) || 0
          const hasGoodConduct = formData.good_conduct_status === 'Valid Certificate' || formData.good_conduct_status === 'Application Receipt'
          const hasRefs = formData.referee_1_name && formData.referee_1_phone
          
          let score = 0
          if (age >= 24 && age <= 45) score += 20
          if (totalExp >= 7) score += 25
          else if (totalExp >= 4) score += 15
          else if (totalExp >= 2) score += 10
          if (kenyaExp >= 7) score += 25
          else if (kenyaExp >= 4) score += 15
          if (hasGoodConduct) score += 15
          if (hasRefs) score += 15
          
          return score
        })(),
        address: formData.address || null,
        apartment: formData.apartment || null,
        id_number: formData.id_number || null,
        email: formData.email || null,
        county: formData.county || null,
        town: formData.town || null,
        estate: formData.estate || null,
        marital_status: formData.marital_status || null,
        has_kids: formData.has_kids,
        kids_count: formData.has_kids ? parseInt(formData.kids_count) || 0 : null,
        has_parents: formData.has_parents || null,
        off_day: formData.off_day || null,
        has_siblings: formData.has_siblings,
        dependent_siblings: formData.has_siblings ? parseInt(formData.dependent_siblings) || 0 : null,
        education_level: formData.education_level || null
      }
      
      // Add scheduled date if status is INTERVIEW_SCHEDULED
      if (formData.status === 'INTERVIEW_SCHEDULED' && formData.scheduledDateOnly) {
        const date = new Date(formData.scheduledDateOnly)
        date.setHours(14, 0, 0, 0) // Set to 2:00 PM
        payload.scheduled_date = date.toISOString()
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
          inquiry_date: formData.inquiry_date || new Date().toISOString().split('T')[0],
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
      if (error?.code === '23505' || error?.message?.includes('duplicate key value violates unique constraint') || error?.message?.includes('uq_candidates_phone')) {
        showToast('Phone number already exists! Please check for duplicates.', 'error')
      } else {
        showToast(`Error saving candidate: ${error?.message || 'Unknown error'}`, 'error')
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
    const csvContent = `Name,Phone,Source,Role,Status,Inquiry Date (YYYY-MM-DD)
Jane Doe,0712345678,TikTok,Nanny,PENDING,2025-01-15
John Smith,0723456789,Facebook,Driver,PENDING,2025-01-14`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'candidates_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      alert('Please select a CSV file to upload')
      return
    }

    setSubmitting(true)
    const preview: Array<{type: 'add' | 'skip' | 'exists' | 'error', name: string, phone: string, message: string, data?: any}> = []
    const results = {
      total: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as Array<{type: 'added' | 'updated' | 'skipped' | 'error', name: string, message: string}>
    }

    try {
      const text = await uploadFile.text()
      const rows = text.split(/\r?\n/).filter(row => row.trim())
      
      if (rows.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        return
      }

      const dataRows = rows.slice(1).filter(row => row.trim())
      
      // Get all existing candidates once
      const { data: existingCandidates } = await supabase
        .from('candidates')
        .select('id, name, phone, status')
      
      const seenPhones = new Set()
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        
        const parts = row.split(',')
        const name = parts[0]?.trim()
        const phone = parts[1]?.trim()
        let source = (parts[2]?.trim() || 'Referral')
        let role = (parts[3]?.trim() || 'Caregiver')
        let status = (parts[4]?.trim() || 'PENDING')
        const inquiry_date = parts[5]?.trim() || new Date().toISOString().split('T')[0]
        
        console.log(`Processing row ${i + 1}:`, { name, phone, source, role, status, inquiry_date })

        if (!name || !phone) {
          preview.push({type: 'error', name: name || 'Unknown', phone: phone || '', message: `Row ${i + 2}: Missing name or phone`})
          continue
        }
        
        // Normalize phone (remove spaces and non-digits except +)
        let normalizedPhone = phone.replace(/[^0-9+]/g, '')
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '+254' + normalizedPhone.substring(1)
        } else if (normalizedPhone.startsWith('254')) {
          normalizedPhone = '+' + normalizedPhone
        } else if (!normalizedPhone.startsWith('+254')) {
          normalizedPhone = '+254' + normalizedPhone
        }
        
        // Check for duplicates within CSV
        if (seenPhones.has(normalizedPhone)) {
          preview.push({type: 'skip', name, phone: normalizedPhone, message: `Duplicate phone in CSV - skipped`})
          continue
        }
        seenPhones.add(normalizedPhone)
        
        const existingCandidate = existingCandidates?.find(c => c.phone === normalizedPhone)
        
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
          'youtube': 'Youtube',
          'referred by church': 'Referred By Church'
        }
        
        const mappedSource = sourceMap[source.toLowerCase()]
        if (mappedSource) {
          source = mappedSource
        } else if (!sourceOptions.includes(source)) {
          source = 'Referral'
        }

        // Validate inputs
        if (!roleOptions.includes(role)) {
          preview.push({type: 'error', name: name || 'Unknown', phone: phone || '', message: `Invalid role: ${role}`})
          continue
        }
        
        if (!sourceOptions.includes(source)) {
          preview.push({type: 'error', name: name || 'Unknown', phone: phone || '', message: `Invalid source: ${source}`})
          continue
        }
        
        if (!statusOptions.includes(status)) {
          preview.push({type: 'error', name: name || 'Unknown', phone: phone || '', message: `Invalid status: ${status}`})
          continue
        }

        const candidateData = { 
          name, 
          phone: normalizedPhone, 
          source,
          role, 
          status, 
          assigned_to: user?.id, 
          inquiry_date,
          added_by: 'System'
        }
        
        console.log('Candidate data prepared:', candidateData)

        if (existingCandidate) {
          // Check if status update is meaningful
          const shouldUpdate = (
            (existingCandidate.status === 'PENDING' && ['WON', 'INTERVIEW_SCHEDULED', 'BLACKLISTED'].includes(status)) ||
            (existingCandidate.status === 'INTERVIEW_SCHEDULED' && ['WON', 'BLACKLISTED'].includes(status)) ||
            (existingCandidate.status.startsWith('Lost') && status === 'BLACKLISTED')
          )
          
          if (shouldUpdate) {
            preview.push({type: 'add', name, phone: normalizedPhone, message: `Will update ${existingCandidate.status} → ${status}`, data: {...candidateData, id: existingCandidate.id, isUpdate: true}})
          } else {
            results.skipped++
            results.details.push({type: 'skipped', name, message: `No meaningful update: ${existingCandidate.status} → ${status}`})
            preview.push({type: 'exists', name, phone: normalizedPhone, message: `Already exists - ${existingCandidate.name} (${existingCandidate.status})`})
          }
          continue
        } else {
          // Will be added
          preview.push({type: 'add', name, phone: normalizedPhone, message: `Will be added as ${status}`, data: candidateData})
        }
      }

      console.log('Final preview data:', preview)
      setPreviewData(preview)
      setShowPreview(true)
      setShowBulkUpload(false)
    } catch (error) {
      console.error('Error previewing candidates:', error)
      alert(`Error previewing candidates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmUpload = async () => {
    const toAdd = previewData.filter(item => item.type === 'add')
    if (toAdd.length === 0) {
      showToast('No candidates to upload', 'error')
      return
    }

    setSubmitting(true)
    try {
      const toInsert = toAdd.filter(item => !item.data.isUpdate).map(item => item.data)
      const toUpdate = toAdd.filter(item => item.data.isUpdate)
      
      if (toInsert.length > 0) {
        const { error } = await supabase.from('candidates').insert(toInsert)
        if (error) throw error
      }
      
      for (const item of toUpdate) {
        const { id, isUpdate, ...updateData } = item.data
        const { error } = await supabase.from('candidates').update(updateData).eq('id', id)
        if (error) throw error
      }

      if (user?.id && staff?.name) {
        await ActivityLogger.logBulkUpload(user.id, 'candidate', toAdd.length, staff.name)
      }

      await loadCandidates()
      setShowPreview(false)
      setPreviewData([])
      setUploadFile(null)
      showToast(`Successfully processed ${toAdd.length} candidates (${toInsert.length} new, ${toUpdate.length} updated)`, 'success')
    } catch (error) {
      console.error('Error uploading candidates:', error)
      showToast(`Error uploading candidates: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', phone: '', source: '', role: '', inquiry_date: '', status: 'PENDING', scheduledDateOnly: '',
      live_arrangement: '', work_schedule: '', employment_type: '', expected_salary: '',
      age: '', place_of_birth: '', next_of_kin_1_phone: '', next_of_kin_1_name: '',
      next_of_kin_1_location: '', next_of_kin_2_phone: '', next_of_kin_2_name: '',
      next_of_kin_2_location: '', referee_1_phone: '', referee_1_name: '',
      referee_2_phone: '', referee_2_name: '', address: '',
      apartment: '', total_years_experience: '', has_good_conduct_cert: false,
      good_conduct_cert_receipt: '', good_conduct_status: '', kenya_years: '',
      qualification_notes: '', id_number: '', email: '', county: '', town: '',
      estate: '', marital_status: '', has_kids: null, kids_count: '',
      has_parents: '', off_day: '', has_siblings: null, dependent_siblings: '',
      education_level: ''
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
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Start date"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="End date"
          />
          
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            >
              Clear Dates
            </button>
          )}
        </div>
        
        {selectedCandidates.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-900">
              {selectedCandidates.length} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm bg-white"
            >
              <option value="">Bulk Update Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!bulkStatus) {
                  alert('Please select a status')
                  return
                }
                
                try {
                  const { error } = await supabase
                    .from('candidates')
                    .update({ status: bulkStatus })
                    .in('id', selectedCandidates)
                  
                  if (error) throw error
                  
                  setCandidates(prev => prev.map(c => 
                    selectedCandidates.includes(c.id) ? { ...c, status: bulkStatus } : c
                  ))
                  
                  // Log bulk status change
                  if (user?.id && staff?.name) {
                    await supabase.from('activity_logs').insert({
                      user_id: user.id,
                      action_type: 'bulk_status_change',
                      entity_type: 'candidate',
                      description: `${staff.name} bulk updated ${selectedCandidates.length} candidates to ${bulkStatus}`
                    })
                  }
                  
                  setSelectedCandidates([])
                  setBulkStatus('')
                  alert(`Updated ${selectedCandidates.length} candidates to ${bulkStatus}`)
                } catch (error: any) {
                  console.error('Error bulk updating:', error)
                  alert(`Error: ${error?.message || 'Unknown error'}`)
                }
              }}
              disabled={!bulkStatus}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={() => setSelectedCandidates([])}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate, index) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandidates(prev => [...prev, candidate.id])
                        } else {
                          setSelectedCandidates(prev => prev.filter(id => id !== candidate.id))
                        }
                      }}
                    />
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDisplayDate(candidate.inquiry_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCandidateForProfile(candidate)
                          setShowProfileModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowModal(true)
                          setSelectedCandidate(candidate)
                          setFormData({
                            name: candidate.name,
                            phone: candidate.phone,
                            source: candidate.source || 'Referral',
                            role: candidate.role,
                            inquiry_date: candidate.inquiry_date,
                            status: candidate.status as any,
                            scheduledDateOnly: candidate.scheduled_date ? new Date(candidate.scheduled_date).toISOString().split('T')[0] : '',
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
                            good_conduct_cert_receipt: candidate.good_conduct_cert_receipt || '',
                            good_conduct_status: candidate.good_conduct_status || '',
                            kenya_years: candidate.kenya_years?.toString() || '',
                            qualification_notes: candidate.qualification_notes || '',
                            id_number: candidate.id_number || '',
                            email: candidate.email || '',
                            county: candidate.county || '',
                            town: candidate.town || '',
                            estate: candidate.estate || '',
                            marital_status: candidate.marital_status || '',
                            has_kids: candidate.has_kids,
                            kids_count: candidate.kids_count?.toString() || '',
                            has_parents: candidate.has_parents || '',
                            off_day: candidate.off_day || '',
                            has_siblings: candidate.has_siblings,
                            dependent_siblings: candidate.dependent_siblings?.toString() || '',
                            education_level: candidate.education_level || ''
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
                            // If setting to INTERVIEW_SCHEDULED, open date picker
                            if (newStatus === 'INTERVIEW_SCHEDULED') {
                              setScheduleModal({ open: true, candidate, dateOnly: '' })
                              e.target.selectedIndex = 0
                              return
                            }
                            
                            // Confirmation for WON status
                            if (newStatus === 'WON') {
                              const confirmed = confirm(`Are you sure you want to mark ${candidate.name} as WON? This indicates they have been successfully placed.`)
                              if (!confirmed) {
                                e.target.selectedIndex = 0
                                return
                              }
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
                        disabled={candidate.status === 'WON' || candidate.status === 'INTERVIEW_SCHEDULED'}
                        className={`px-2 py-1 border border-gray-300 rounded text-sm ${
                          candidate.status === 'WON' || candidate.status === 'INTERVIEW_SCHEDULED' 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white'
                        }`}
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
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inquiry Date (leave blank for today)</label>
                  <input
                    type="date"
                    value={formData.inquiry_date || ''}
                    onChange={(e) => setFormData({ ...formData, inquiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    disabled={selectedCandidate && (selectedCandidate.status === 'WON' || selectedCandidate.status === 'INTERVIEW_SCHEDULED')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent ${
                      selectedCandidate && (selectedCandidate.status === 'WON' || selectedCandidate.status === 'INTERVIEW_SCHEDULED')
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {selectedCandidate && (selectedCandidate.status === 'WON' || selectedCandidate.status === 'INTERVIEW_SCHEDULED') && (
                    <p className="text-xs text-gray-500 mt-1">Status locked - Use Staff or Interviews page to modify</p>
                  )}
                </div>

                {formData.status === 'INTERVIEW_SCHEDULED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                    <input
                      type="date"
                      value={formData.scheduledDateOnly}
                      onChange={(e) => setFormData({ ...formData, scheduledDateOnly: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                      required
                    />
                  </div>
                )}

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
                  <div className="space-y-4">
                    {/* Work Preferences */}
                    <div className="bg-green-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Work Preferences</h3>
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
                    </div>

                    {/* Personal Details */}
                    <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                          <input
                            type="text"
                            value={formData.id_number}
                            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
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
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                          <input
                            type="text"
                            value={formData.county}
                            onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Town</label>
                          <input
                            type="text"
                            value={formData.town}
                            onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estate</label>
                          <input
                            type="text"
                            value={formData.estate}
                            onChange={(e) => setFormData({ ...formData, estate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                          <input
                            type="text"
                            value={formData.place_of_birth}
                            onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                          <select
                            value={formData.marital_status}
                            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Parents Status</label>
                          <select
                            value={formData.has_parents}
                            onChange={(e) => setFormData({ ...formData, has_parents: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Both Parents">Both Parents</option>
                            <option value="Single Parent">Single Parent</option>
                            <option value="No Parents">No Parents</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.has_kids}
                              onChange={(e) => setFormData({ ...formData, has_kids: e.target.checked })}
                              className="mr-2"
                            />
                            Has Kids
                          </label>
                          {formData.has_kids && (
                            <input
                              type="number"
                              placeholder="How many?"
                              value={formData.kids_count}
                              onChange={(e) => setFormData({ ...formData, kids_count: e.target.value })}
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                            />
                          )}
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.has_siblings}
                              onChange={(e) => setFormData({ ...formData, has_siblings: e.target.checked })}
                              className="mr-2"
                            />
                            Has Siblings
                          </label>
                          {formData.has_siblings && (
                            <input
                              type="number"
                              placeholder="How many depend on you?"
                              value={formData.dependent_siblings}
                              onChange={(e) => setFormData({ ...formData, dependent_siblings: e.target.value })}
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                          <select
                            value={formData.education_level}
                            onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Primary">Primary</option>
                            <option value="Secondary">Secondary</option>
                            <option value="College">College</option>
                            <option value="University">University</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Day Off</label>
                          <select
                            value={formData.off_day}
                            onChange={(e) => setFormData({ ...formData, off_day: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Experience & Qualifications */}
                    <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Experience & Qualifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Years Experience</label>
                          <input
                            type="number"
                            value={formData.total_years_experience}
                            onChange={(e) => setFormData({ ...formData, total_years_experience: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kenya Years Experience</label>
                          <input
                            type="number"
                            value={formData.kenya_years}
                            onChange={(e) => setFormData({ ...formData, kenya_years: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Good Conduct Status</label>
                        <select
                          value={formData.good_conduct_status}
                          onChange={(e) => setFormData({ ...formData, good_conduct_status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        >
                          <option value="">Select status</option>
                          <option value="Valid Certificate">Valid Certificate</option>
                          <option value="Application Receipt">Application Receipt</option>
                          <option value="Expired">Expired</option>
                          <option value="None">None</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Comments</label>
                        <textarea
                          value={formData.qualification_notes}
                          onChange={(e) => setFormData({ ...formData, qualification_notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          placeholder="Add any notes or comments..."
                        />
                      </div>

                      {selectedCandidate?.added_by === 'System' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              const age = parseInt(formData.age) || 0
                              const totalExp = parseInt(formData.total_years_experience) || 0
                              const kenyaExp = parseInt(formData.kenya_years) || 0
                              const hasGoodConduct = formData.good_conduct_status === 'Valid Certificate' || formData.good_conduct_status === 'Application Receipt'
                              const hasRefs = formData.referee_1_name && formData.referee_1_phone
                              
                              let score = 0
                              let notes = 'Assessment: '
                              
                              // Age check (24-45)
                              if (age >= 24 && age <= 45) {
                                score += 20
                                notes += 'Age appropriate. '
                              } else {
                                notes += 'Age outside range (24-45). '
                              }
                              
                              // Experience scoring
                              if (totalExp >= 7) {
                                score += 25
                                notes += 'Excellent experience. '
                              } else if (totalExp >= 4) {
                                score += 15
                                notes += 'Good experience. '
                              } else if (totalExp >= 2) {
                                score += 10
                                notes += 'Limited experience. '
                              } else {
                                notes += 'Insufficient experience. '
                              }
                              
                              // Kenya experience
                              if (kenyaExp >= 7) {
                                score += 25
                                notes += 'Strong Kenya experience. '
                              } else if (kenyaExp >= 4) {
                                score += 15
                                notes += 'Adequate Kenya experience. '
                              } else {
                                notes += 'Limited Kenya experience. '
                              }
                              
                              // Good conduct
                              if (hasGoodConduct) {
                                score += 15
                                notes += 'Valid documentation. '
                              } else {
                                notes += 'Missing good conduct certificate. '
                              }
                              
                              // References
                              if (hasRefs) {
                                score += 15
                                notes += 'References provided. '
                              } else {
                                notes += 'No references provided. '
                              }
                              
                              setFormData(prev => ({
                                ...prev,
                                qualification_notes: notes + (prev.qualification_notes ? '\n\nAdditional notes: ' + prev.qualification_notes : '')
                              }))
                              
                              alert(`Qualification Score: ${score}/100\n\n${notes}`)
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Calculate Qualification Score
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Location</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Where do you stay</label>
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
                    </div>



                    {/* Emergency Contacts */}
                    <div className="bg-red-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contacts</h3>
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
                          <PhoneInput
                            value={formData.next_of_kin_1_phone}
                            onChange={(value) => setFormData({ ...formData, next_of_kin_1_phone: value })}
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
                          <PhoneInput
                            value={formData.next_of_kin_2_phone}
                            onChange={(value) => setFormData({ ...formData, next_of_kin_2_phone: value })}
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

                    {/* References */}
                    <div className="bg-indigo-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">References</h3>
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
                          <PhoneInput
                            value={formData.referee_1_phone}
                            onChange={(value) => setFormData({ ...formData, referee_1_phone: value })}
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
                          <PhoneInput
                            value={formData.referee_2_phone}
                            onChange={(value) => setFormData({ ...formData, referee_2_phone: value })}
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

              <form onSubmit={handlePreview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                {submitting && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-blue-800">Processing upload...</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkUpload(false)
                      setUploadFile(null)
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !uploadFile}
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Preview'}
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
                    Interview Date (Time will be set to 9:00 AM)
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
                        date.setHours(9, 0, 0, 0) // Set to 9:00 AM
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

      {/* Candidate Profile Modal */}
      {showProfileModal && selectedCandidateForProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-1/2 h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header with Nestara branding */}
              <div className="bg-[#ae491e] text-white p-6 rounded-lg mb-6" style={{letterSpacing: '-1px'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">NESTARA ID CARD</h2>
                    <p className="text-white">{selectedCandidateForProfile.name}</p>
                  </div>

                </div>
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Full Name:</span> {selectedCandidateForProfile.name}</div>
                    <div><span className="font-semibold">Phone:</span> {selectedCandidateForProfile.phone}</div>
                    <div><span className="font-semibold">ID Number:</span> {selectedCandidateForProfile.id_number || 'Not specified'}</div>
                    <div><span className="font-semibold">Email:</span> {selectedCandidateForProfile.email || 'Not specified'}</div>
                    <div><span className="font-semibold">Age:</span> {selectedCandidateForProfile.age || 'Not specified'}</div>
                    <div><span className="font-semibold">Place of Birth:</span> {selectedCandidateForProfile.place_of_birth || 'Not specified'}</div>
                    <div><span className="font-semibold">Marital Status:</span> {selectedCandidateForProfile.marital_status || 'Not specified'}</div>
                    <div><span className="font-semibold">Has Kids:</span> {selectedCandidateForProfile.has_kids === null || selectedCandidateForProfile.has_kids === undefined ? 'Not specified' : selectedCandidateForProfile.has_kids ? `Yes (${selectedCandidateForProfile.kids_count || 0})` : 'No'}</div>
                    <div><span className="font-semibold">Parents Status:</span> {selectedCandidateForProfile.has_parents || 'Not specified'}</div>
                    <div><span className="font-semibold">Has Siblings:</span> {selectedCandidateForProfile.has_siblings === null || selectedCandidateForProfile.has_siblings === undefined ? 'Not specified' : selectedCandidateForProfile.has_siblings ? `Yes (${selectedCandidateForProfile.dependent_siblings || 0} dependent)` : 'No'}</div>
                    <div><span className="font-semibold">Education Level:</span> {selectedCandidateForProfile.education_level || 'Not specified'}</div>
                    <div><span className="font-semibold">Preferred Day Off:</span> {selectedCandidateForProfile.off_day || 'Not specified'}</div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Professional Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Role:</span> <span className="text-[#ae491e] font-semibold">{selectedCandidateForProfile.role}</span></div>
                    <div><span className="font-semibold">Status:</span> <StatusBadge status={selectedCandidateForProfile.status} type="candidate" /></div>
                    <div><span className="font-semibold">Kenya Experience:</span> {selectedCandidateForProfile.kenya_years || 'Not specified'} years</div>
                    <div><span className="font-semibold">Total Experience:</span> {selectedCandidateForProfile.total_years_experience || 'Not specified'} years</div>
                    <div><span className="font-semibold">Good Conduct:</span> {selectedCandidateForProfile.good_conduct_status || (selectedCandidateForProfile.has_good_conduct_cert ? 'Valid Certificate' : 'Not provided')}</div>
                    <div><span className="font-semibold">Qualification Score:</span> {(() => {
                      if (selectedCandidateForProfile.qualification_score !== null && selectedCandidateForProfile.qualification_score !== undefined) {
                        return selectedCandidateForProfile.qualification_score
                      }
                      // Calculate score for display
                      const age = selectedCandidateForProfile.age || 0
                      const totalExp = selectedCandidateForProfile.total_years_experience || 0
                      const kenyaExp = selectedCandidateForProfile.kenya_years || 0
                      const hasGoodConduct = selectedCandidateForProfile.good_conduct_status === 'Valid Certificate' || selectedCandidateForProfile.good_conduct_status === 'Application Receipt'
                      const hasRefs = selectedCandidateForProfile.referee_1_name && selectedCandidateForProfile.referee_1_phone
                      
                      console.log('Candidate data:', {
                        age,
                        totalExp,
                        kenyaExp,
                        hasGoodConduct,
                        hasRefs,
                        good_conduct_status: selectedCandidateForProfile.good_conduct_status,
                        referee_1_name: selectedCandidateForProfile.referee_1_name,
                        referee_1_phone: selectedCandidateForProfile.referee_1_phone
                      })
                      
                      let score = 0
                      if (age >= 24 && age <= 45) score += 20
                      if (totalExp >= 7) score += 25
                      else if (totalExp >= 4) score += 15
                      else if (totalExp >= 2) score += 10
                      if (kenyaExp >= 7) score += 25
                      else if (kenyaExp >= 4) score += 15
                      if (hasGoodConduct) score += 15
                      if (hasRefs) score += 15
                      
                      console.log('Calculated score:', score)
                      return score
                    })()}/100</div>
                  </div>
                  {selectedCandidateForProfile.work_experiences && (
                    <div className="mt-3">
                      <span className="font-semibold">Work History:</span>
                      <div className="ml-4 text-xs mt-1">
                        {JSON.parse(selectedCandidateForProfile.work_experiences).map((exp: any, i: number) => (
                          <div key={i}>• {exp.employer_name} ({exp.country}) - {exp.start_date} to {exp.still_working ? 'Present' : exp.end_date}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCandidateForProfile.qualification_notes && (
                    <div className="mt-3">
                      <span className="font-semibold">Notes/Comments:</span>
                      <div className="text-xs mt-1">{selectedCandidateForProfile.qualification_notes}</div>
                    </div>
                  )}
                </div>

                {/* Internal Rating & Recommendation */}
                {(() => {
                  let score = selectedCandidateForProfile.qualification_score
                  if (score === null || score === undefined) {
                    const age = selectedCandidateForProfile.age || 0
                    const totalExp = selectedCandidateForProfile.total_years_experience || 0
                    const kenyaExp = selectedCandidateForProfile.kenya_years || 0
                    const hasGoodConduct = selectedCandidateForProfile.good_conduct_status === 'Valid Certificate' || selectedCandidateForProfile.good_conduct_status === 'Application Receipt'
                    const hasRefs = selectedCandidateForProfile.referee_1_name && selectedCandidateForProfile.referee_1_phone
                    
                    score = 0
                    if (age >= 24 && age <= 45) score += 20
                    if (totalExp >= 7) score += 25
                    else if (totalExp >= 4) score += 15
                    else if (totalExp >= 2) score += 10
                    if (kenyaExp >= 7) score += 25
                    else if (kenyaExp >= 4) score += 15
                    if (hasGoodConduct) score += 15
                    if (hasRefs) score += 15
                  }
                  return score > 0
                })() && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Internal Assessment</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-semibold">Rating:</span> {(() => {
                        let score = selectedCandidateForProfile.qualification_score
                        if (score === null || score === undefined) {
                          const age = selectedCandidateForProfile.age || 0
                          const totalExp = selectedCandidateForProfile.total_years_experience || 0
                          const kenyaExp = selectedCandidateForProfile.kenya_years || 0
                          const hasGoodConduct = selectedCandidateForProfile.good_conduct_status === 'Valid Certificate' || selectedCandidateForProfile.good_conduct_status === 'Application Receipt'
                          const hasRefs = selectedCandidateForProfile.referee_1_name && selectedCandidateForProfile.referee_1_phone
                          
                          score = 0
                          if (age >= 24 && age <= 45) score += 20
                          if (totalExp >= 7) score += 25
                          else if (totalExp >= 4) score += 15
                          else if (totalExp >= 2) score += 10
                          if (kenyaExp >= 7) score += 25
                          else if (kenyaExp >= 4) score += 15
                          if (hasGoodConduct) score += 15
                          if (hasRefs) score += 15
                        }
                        return score
                      })()}/100</div>
                      <div className="bg-white p-3 rounded border-l-4 border-orange-400">
                        <span className="font-semibold">Recommendation:</span>
                        <div className="mt-1">
                          {(() => {
                            let score = selectedCandidateForProfile.qualification_score
                            if (score === null || score === undefined) {
                              const age = selectedCandidateForProfile.age || 0
                              const totalExp = selectedCandidateForProfile.total_years_experience || 0
                              const kenyaExp = selectedCandidateForProfile.kenya_years || 0
                              const hasGoodConduct = selectedCandidateForProfile.good_conduct_status === 'Valid Certificate' || selectedCandidateForProfile.good_conduct_status === 'Application Receipt'
                              const hasRefs = selectedCandidateForProfile.referee_1_name && selectedCandidateForProfile.referee_1_phone
                              
                              score = 0
                              if (age >= 24 && age <= 45) score += 20
                              if (totalExp >= 7) score += 25
                              else if (totalExp >= 4) score += 15
                              else if (totalExp >= 2) score += 10
                              if (kenyaExp >= 7) score += 25
                              else if (kenyaExp >= 4) score += 15
                              if (hasGoodConduct) score += 15
                              if (hasRefs) score += 15
                            }
                            score = score || 0
                            const kenyaYears = selectedCandidateForProfile.kenya_years || 0
                            const hasGoodConduct = selectedCandidateForProfile.good_conduct_status === 'Valid Certificate'
                            const hasReferees = selectedCandidateForProfile.referee_1_name && selectedCandidateForProfile.referee_1_phone
                            
                            let recommendation = `Candidate scored ${score}/100. `
                            
                            if (score >= 80) {
                              recommendation += "Excellent candidate - highly recommended for placement."
                            } else if (score >= 65) {
                              recommendation += "Good candidate - recommended with minor considerations."
                            } else if (score >= 45) {
                              recommendation += "Average candidate - proceed with caution."
                            } else {
                              recommendation += "Below average - not recommended."
                            }
                            
                            recommendation += " Strengths: "
                            const strengths = []
                            if (kenyaYears >= 7) strengths.push(`${kenyaYears} years Kenya experience`)
                            if (hasGoodConduct) strengths.push("valid good conduct certificate")
                            if (hasReferees) strengths.push("professional references provided")
                            
                            if (strengths.length > 0) {
                              recommendation += strengths.join(", ") + "."
                            } else {
                              recommendation += "Limited qualifications."
                            }
                            
                            const gaps = []
                            if (kenyaYears < 4) gaps.push("insufficient Kenya experience")
                            if (!hasGoodConduct) gaps.push("missing good conduct certificate")
                            if (!hasReferees) gaps.push("no professional references")
                            
                            if (gaps.length > 0) {
                              recommendation += " Areas for improvement: " + gaps.join(", ") + "."
                            }
                            
                            return recommendation
                          })()
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Preferences */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Work Preferences</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Live Arrangement:</span> {selectedCandidateForProfile.live_arrangement || 'Not specified'}</div>
                    <div><span className="font-semibold">Work Schedule:</span> {selectedCandidateForProfile.work_schedule || 'Not specified'}</div>
                    <div><span className="font-semibold">Employment Type:</span> {selectedCandidateForProfile.employment_type || 'Not specified'}</div>
                    <div><span className="font-semibold">Expected Salary:</span> {selectedCandidateForProfile.expected_salary ? `KSh ${selectedCandidateForProfile.expected_salary.toLocaleString()}` : 'Not specified'}</div>
                    <div><span className="font-semibold">County:</span> {selectedCandidateForProfile.county || 'Not specified'}</div>
                    <div><span className="font-semibold">Town:</span> {selectedCandidateForProfile.town || 'Not specified'}</div>
                    <div><span className="font-semibold">Estate:</span> {selectedCandidateForProfile.estate || 'Not specified'}</div>
                  </div>
                </div>

                {/* Location */}
                {selectedCandidateForProfile.address && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Location</h3>
                    <div className="text-sm space-y-2">
                      <div><span className="font-semibold">Address:</span> {selectedCandidateForProfile.address}</div>
                      {selectedCandidateForProfile.apartment && (
                        <div><span className="font-semibold">Apartment:</span> {selectedCandidateForProfile.apartment}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Emergency Contacts */}
                {(selectedCandidateForProfile.next_of_kin_1_name || selectedCandidateForProfile.next_of_kin_2_name) && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Emergency Contacts</h3>
                    <div className="space-y-3 text-sm">
                      {selectedCandidateForProfile.next_of_kin_1_name && (
                        <div>
                          <div className="font-bold text-gray-800">Next of Kin 1:</div>
                          <div><span className="font-semibold">Name:</span> {selectedCandidateForProfile.next_of_kin_1_name}</div>
                          {selectedCandidateForProfile.next_of_kin_1_phone && <div><span className="font-semibold">Phone:</span> {selectedCandidateForProfile.next_of_kin_1_phone}</div>}
                          {selectedCandidateForProfile.next_of_kin_1_location && <div><span className="font-semibold">Location:</span> {selectedCandidateForProfile.next_of_kin_1_location}</div>}
                        </div>
                      )}
                      {selectedCandidateForProfile.next_of_kin_2_name && (
                        <div>
                          <div className="font-bold text-gray-800">Next of Kin 2:</div>
                          <div><span className="font-semibold">Name:</span> {selectedCandidateForProfile.next_of_kin_2_name}</div>
                          {selectedCandidateForProfile.next_of_kin_2_phone && <div><span className="font-semibold">Phone:</span> {selectedCandidateForProfile.next_of_kin_2_phone}</div>}
                          {selectedCandidateForProfile.next_of_kin_2_location && <div><span className="font-semibold">Location:</span> {selectedCandidateForProfile.next_of_kin_2_location}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References */}
                {(selectedCandidateForProfile.referee_1_name || selectedCandidateForProfile.referee_2_name) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">References</h3>
                    <div className="space-y-3 text-sm">
                      {selectedCandidateForProfile.referee_1_name && (
                        <div>
                          <div className="font-bold text-gray-800">Reference 1:</div>
                          <div><span className="font-semibold">Name:</span> {selectedCandidateForProfile.referee_1_name}</div>
                          {selectedCandidateForProfile.referee_1_phone && <div><span className="font-semibold">Phone:</span> {selectedCandidateForProfile.referee_1_phone}</div>}
                        </div>
                      )}
                      {selectedCandidateForProfile.referee_2_name && (
                        <div>
                          <div className="font-bold text-gray-800">Reference 2:</div>
                          <div><span className="font-semibold">Name:</span> {selectedCandidateForProfile.referee_2_name}</div>
                          {selectedCandidateForProfile.referee_2_phone && <div><span className="font-semibold">Phone:</span> {selectedCandidateForProfile.referee_2_phone}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Registration Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Inquiry Date:</span> {formatDisplayDate(selectedCandidateForProfile.inquiry_date)}</div>
                    <div><span className="font-semibold">Source:</span> {selectedCandidateForProfile.source || 'N/A'}</div>
                    <div><span className="font-semibold">Preferred Interview Date:</span> {selectedCandidateForProfile.preferred_interview_date ? (() => {
                      const date = new Date(selectedCandidateForProfile.preferred_interview_date)
                      const day = date.getDate()
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                      const month = date.toLocaleDateString('en-US', { month: 'long' })
                      const year = date.getFullYear()
                      return `${dayName}, ${day}${suffix} ${month} ${year}`
                    })() : 'Not specified'}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setSelectedCandidateForProfile(null)
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Complete!</h2>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Total Processed:</span> {uploadResults.total}</div>
                  <div><span className="font-medium text-green-600">New Added:</span> {uploadResults.added}</div>
                  <div><span className="font-medium text-blue-600">Updated:</span> {uploadResults.updated}</div>
                  <div><span className="font-medium text-yellow-600">Skipped:</span> {uploadResults.skipped}</div>
                </div>
                {uploadResults.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-red-600">Errors:</span> {uploadResults.errors.length}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Details</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {uploadResults.details.map((detail, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                      detail.type === 'added' ? 'bg-green-50' :
                      detail.type === 'updated' ? 'bg-blue-50' :
                      detail.type === 'skipped' ? 'bg-yellow-50' :
                      'bg-red-50'
                    }`}>
                      <span className="text-lg">
                        {detail.type === 'added' ? '✅' :
                         detail.type === 'updated' ? '🔄' :
                         detail.type === 'skipped' ? '⏭️' :
                         '❌'}
                      </span>
                      <div>
                        <div className="font-medium">{detail.name}</div>
                        <div className={`text-xs ${
                          detail.type === 'added' ? 'text-green-700' :
                          detail.type === 'updated' ? 'text-blue-700' :
                          detail.type === 'skipped' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {detail.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors */}
              {uploadResults.errors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-3">❌ Errors</h3>
                  <div className="bg-red-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                    {uploadResults.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowUploadResults(false)
                    setUploadResults({ total: 0, added: 0, updated: 0, skipped: 0, errors: [], details: [] })
                  }}
                  className="px-6 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Preview</h2>
              
              <div className="mb-4 flex gap-4 text-sm">
                <span className="text-green-600">✅ To Add: {previewData.filter(p => p.type === 'add').length}</span>
                <span className="text-blue-600">📋 Exists: {previewData.filter(p => p.type === 'exists').length}</span>
                <span className="text-yellow-600">⚠️ To Skip: {previewData.filter(p => p.type === 'skip').length}</span>
                <span className="text-red-600">❌ Errors: {previewData.filter(p => p.type === 'error').length}</span>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {previewData.map((item, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    item.type === 'add' ? 'bg-green-50 border-green-200' :
                    item.type === 'exists' ? 'bg-blue-50 border-blue-200' :
                    item.type === 'skip' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.phone}</div>
                      </div>
                      <div className={`text-sm ${
                        item.type === 'add' ? 'text-green-700' :
                        item.type === 'exists' ? 'text-blue-700' :
                        item.type === 'skip' ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {item.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setPreviewData([])
                    setShowBulkUpload(true)
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back to Upload
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={submitting || previewData.filter(p => p.type === 'add').length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : `Confirm Upload (${previewData.filter(p => p.type === 'add').length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}