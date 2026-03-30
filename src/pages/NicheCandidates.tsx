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

// Helper function to format display date
const formatDisplayDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}
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
  const [duplicateWarning, setDuplicateWarning] = useState<{ phone?: string; name?: string; phoneRecord?: any; nameRecord?: any }>({})
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecord, setDuplicateRecord] = useState<any>(null)
  const [duplicateRecordNotes, setDuplicateRecordNotes] = useState<any[]>([])
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [importPreview, setImportPreview] = useState<{ toAdd: any[]; toSkip: any[] }>({ toAdd: [], toSkip: [] })
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [importProgress, setImportProgress] = useState(0)

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

                  // Debounced duplicate checking - removed live search, only checks on form submission

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
      // Could show error in UI if needed
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
      // Normalize phone number for duplicate checking
      const normalizedPhone = formData.phone.trim().replace(/[^0-9]/g, '')
      
      // Check for duplicates before submitting (only for new candidates)
      if (!selectedCandidate) {
        const normalizedInputPhone = normalizePhone(formData.phone)
        
        // FIRST: Check blacklist (highest priority)
        const { data: allBlacklistEntries } = await supabase
          .from('blacklist')
          .select('id, name, phone, reason')
        
        const blacklistPhoneMatch = allBlacklistEntries?.find(entry => 
          normalizePhone(entry.phone) === normalizedInputPhone
        )
        
        if (blacklistPhoneMatch) {
          setDuplicateWarning({
            phone: `BLACKLISTED: ${blacklistPhoneMatch.name} (${blacklistPhoneMatch.reason})`,
            phoneRecord: { ...blacklistPhoneMatch, status: 'BLACKLISTED', table_source: 'blacklist' }
          })
          return
        }
        
        // SECOND: Check for phone number duplicates in niche_candidates
        const { data: allNicheCandidates } = await supabase
          .from('niche_candidates')
          .select('id, name, phone, status, role, email, age, source, inquiry_date, created_at, qualification_notes')
        
        const nichePhoneMatch = allNicheCandidates?.find(candidate => 
          normalizePhone(candidate.phone) === normalizedInputPhone
        )
        
        if (nichePhoneMatch) {
          // Set warning instead of toast
          setDuplicateWarning({
            phone: `Phone exists in NICHE: ${nichePhoneMatch.name}`,
            phoneRecord: { ...nichePhoneMatch, table_source: 'niche_candidates' }
          })
          return
        }
        
        // THIRD: Check for phone number in main candidates table
        const { data: allMainCandidates } = await supabase
          .from('candidates')
          .select('id, name, phone, status, role, email, age, source, inquiry_date, created_at')
        
        const mainPhoneMatch = allMainCandidates?.find(candidate => 
          normalizePhone(candidate.phone) === normalizedInputPhone
        )
        
        if (mainPhoneMatch) {
          setDuplicateWarning({
            phone: `Phone exists in MAIN: ${mainPhoneMatch.name}`,
            phoneRecord: { ...mainPhoneMatch, table_source: 'candidates' }
          })
          return
        }
        
        // Check for name + role combination duplicates in niche_candidates
        const { data: nameRoleCheck, error: nameRoleError } = await supabase
          .from('niche_candidates')
          .select('id, name, role, phone, status')
          .eq('name', formData.name.trim())
          .eq('role', formData.role)
        
        if (nameRoleCheck && nameRoleCheck.length > 0 && !nameRoleError) {
          const existing = nameRoleCheck[0]
          const confirmDuplicate = confirm(
            `A NICHE candidate named "${existing.name}" with role "${existing.role}" already exists (Phone: ${existing.phone}). \n\nAre you sure you want to add another candidate with the same name and role?`
          )
          if (!confirmDuplicate) {
            return
          }
        }
        
        // Check for name + role combination in main candidates
        const { data: mainNameRoleCheck } = await supabase
          .from('candidates')
          .select('id, name, role, phone, status')
          .eq('name', formData.name.trim())
          .eq('role', formData.role)
        
        if (mainNameRoleCheck && mainNameRoleCheck.length > 0) {
          const existing = mainNameRoleCheck[0]
          const confirmMainDuplicate = confirm(
            `A MAIN candidate named "${existing.name}" with role "${existing.role}" already exists (Phone: ${existing.phone}). \n\nAre you sure you want to add this as a NICHE candidate?`
          )
          if (!confirmMainDuplicate) {
            return
          }
        }
        
        // Check for name in blacklist
        const { data: blacklistNameCheck } = await supabase
          .from('blacklist')
          .select('id, name, phone, reason')
          .eq('name', formData.name.trim())
        
        if (blacklistNameCheck && blacklistNameCheck.length > 0) {
          const existing = blacklistNameCheck[0]
          const confirmBlacklist = confirm(
            `Name "${existing.name}" is BLACKLISTED (${existing.reason}). Phone: ${existing.phone}\n\nAre you sure you want to add this candidate?`
          )
          if (!confirmBlacklist) {
            return
          }
        }
      }
      
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
        // For updates, check if phone is being changed to an existing one
        if (formData.phone.trim() !== selectedCandidate.phone) {
          const normalizedInputPhone = normalizePhone(formData.phone)
          
          const { data: allNicheCandidates } = await supabase
            .from('niche_candidates')
            .select('id, name, phone, status')
            .neq('id', selectedCandidate.id)
          
          const phoneUpdateMatch = allNicheCandidates?.find(candidate => 
            normalizePhone(candidate.phone) === normalizedInputPhone
          )
          
          if (phoneUpdateMatch) {
            setDuplicateWarning({
              phone: `Phone exists: ${phoneUpdateMatch.name}`,
              phoneRecord: phoneUpdateMatch
            })
            return
          }
        }
        
        const { error } = await supabase
          .from('niche_candidates')
          .update(payload)
          .eq('id', selectedCandidate.id)
        if (error) throw error
        
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, ...payload } : c))
        // Clear warnings and close modal on successful update
        setDuplicateWarning({})
        setShowModal(false)
        resetForm()
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
        // Clear warnings and close modal on successful add
        setDuplicateWarning({})
        setShowModal(false)
        resetForm()
      }
      
      // Don't close modal or reset form here - let success handling do it
    } catch (error: any) {
      console.error('Error saving NICHE candidate:', error)
      // Show error as persistent warning instead of toast
      if (error?.code === '23505') {
        if (error.message.includes('phone')) {
          setDuplicateWarning({
            phone: 'Phone number already exists!',
            phoneRecord: null
          })
        } else {
          setDuplicateWarning({
            phone: 'Duplicate entry detected!',
            phoneRecord: null
          })
        }
      } else {
        setDuplicateWarning({
          phone: `Error: ${error?.message || 'Unknown error'}`,
          phoneRecord: null
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', phone: '', source: '', role: '', inquiry_date: '', status: 'New Inquiry', 
      scheduledDateOnly: '', age: '', email: '', qualification_notes: '', category: '2-Week Flagship'
    })
    setSelectedCandidate(null)
    setDuplicateWarning({})
    setShowDuplicateModal(false)
    setDuplicateRecord(null)
  }

  // Normalize phone number for consistent comparison
  const normalizePhone = (phone: string) => {
    if (!phone) return ''
    // Remove all non-digits
    let cleaned = phone.replace(/[^0-9]/g, '')
    // Remove leading +254 or 254
    if (cleaned.startsWith('254')) {
      cleaned = cleaned.substring(3)
    }
    // Remove leading 0
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    // Return the core number (should be 9 digits for Kenya)
    return cleaned
  }

  // Check for duplicates as user types - REMOVED

  const handleImportFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      // Validate and clean data
      const cleanedData = jsonData.map((row: any, index: number) => {
        const cleaned = {
          name: row.Name?.toString().trim() || '',
          phone: row.Phone?.toString().trim() || '',
          source: row.Source?.toString().trim() || '',
          role: row.Role?.toString().trim() || '',
          category: row.Category?.toString().trim() || '2-Week Flagship',
          notes: row.Notes?.toString().trim() || '',
          rowIndex: index + 2 // Excel row number (accounting for header)
        }
        
        // Validate required fields
        cleaned.errors = []
        if (!cleaned.name) cleaned.errors.push('Name is required')
        if (!cleaned.phone) cleaned.errors.push('Phone is required')
        if (!cleaned.source) cleaned.errors.push('Source is required')
        if (!cleaned.role) cleaned.errors.push('Role is required')
        if (!roleOptions.includes(cleaned.role)) cleaned.errors.push('Invalid role')
        if (!sourceOptions.includes(cleaned.source)) cleaned.errors.push('Invalid source')
        if (!['2-Week Flagship', 'Short Course'].includes(cleaned.category)) {
          cleaned.category = '2-Week Flagship'
        }
        
        return cleaned
      }).filter(row => row.name || row.phone) // Remove completely empty rows
      
      setImportData(cleanedData)
      setImportStep('preview')
      await checkImportDuplicates(cleanedData)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading Excel file. Please check the format.')
    }
  }
  
  const checkImportDuplicates = async (data: any[]) => {
    try {
      // Get all existing records for duplicate checking
      const [nicheData, mainData, blacklistData] = await Promise.all([
        supabase.from('niche_candidates').select('name, phone, status'),
        supabase.from('candidates').select('name, phone, status'),
        supabase.from('blacklist').select('name, phone, reason')
      ])
      
      const existingNiche = nicheData.data || []
      const existingMain = mainData.data || []
      const existingBlacklist = blacklistData.data || []
      
      const toAdd: any[] = []
      const toSkip: any[] = []
      
      data.forEach(row => {
        if (row.errors && row.errors.length > 0) {
          toSkip.push({ ...row, skipReason: `Validation errors: ${row.errors.join(', ')}` })
          return
        }
        
        const normalizedPhone = normalizePhone(row.phone)
        
        // Check blacklist first
        const blacklistMatch = existingBlacklist.find(entry => 
          normalizePhone(entry.phone) === normalizedPhone
        )
        if (blacklistMatch) {
          toSkip.push({ ...row, skipReason: `BLACKLISTED: ${blacklistMatch.reason}` })
          return
        }
        
        // Check niche candidates
        const nicheMatch = existingNiche.find(candidate => 
          normalizePhone(candidate.phone) === normalizedPhone
        )
        if (nicheMatch) {
          toSkip.push({ ...row, skipReason: `Already exists in NICHE (${nicheMatch.status})` })
          return
        }
        
        // Check main candidates
        const mainMatch = existingMain.find(candidate => 
          normalizePhone(candidate.phone) === normalizedPhone
        )
        if (mainMatch) {
          toSkip.push({ ...row, skipReason: `Already exists in MAIN (${mainMatch.status})` })
          return
        }
        
        // No duplicates found, can be added
        toAdd.push(row)
      })
      
      setImportPreview({ toAdd, toSkip })
    } catch (error) {
      console.error('Error checking duplicates:', error)
    }
  }
  
  const handleImportConfirm = async () => {
    if (importPreview.toAdd.length === 0) return
    
    setImportStep('importing')
    setImportProgress(0)
    
    try {
      const batchSize = 10
      const batches = []
      
      for (let i = 0; i < importPreview.toAdd.length; i += batchSize) {
        batches.push(importPreview.toAdd.slice(i, i + batchSize))
      }
      
      let imported = 0
      
      for (const batch of batches) {
        const insertData = batch.map(row => ({
          name: row.name,
          phone: row.phone,
          source: row.source,
          role: row.role,
          category: row.category,
          qualification_notes: row.notes || null,
          status: 'New Inquiry',
          inquiry_date: new Date().toISOString().split('T')[0],
          assigned_to: user?.id,
          added_by: staff?.name || 'System'
        }))
        
        const { error } = await supabase
          .from('niche_candidates')
          .insert(insertData)
        
        if (error) throw error
        
        imported += batch.length
        setImportProgress(Math.round((imported / importPreview.toAdd.length) * 100))
      }
      
      // Reload candidates
      await loadCandidates()
      
      // Reset import state
      setShowImportModal(false)
      setImportFile(null)
      setImportData([])
      setImportPreview({ toAdd: [], toSkip: [] })
      setImportStep('upload')
      setImportProgress(0)
      
      alert(`Successfully imported ${imported} candidates!`)
    } catch (error) {
      console.error('Error importing:', error)
      alert('Error importing candidates. Please try again.')
    }
  }
  
  const downloadTemplate = () => {
    // Create sample data with proper format
    const templateData = [
      {
        Name: 'Jane Doe',
        Phone: '0712345678',
        Source: 'TikTok',
        Role: 'Nanny',
        Category: '2-Week Flagship',
        Notes: 'Experienced with toddlers, available immediately'
      },
      {
        Name: 'John Smith',
        Phone: '0723456789',
        Source: 'Facebook',
        Role: 'House Manager',
        Category: 'Short Course',
        Notes: 'Previous hotel management experience'
      },
      {
        Name: 'Mary Johnson',
        Phone: '0734567890',
        Source: 'Referral',
        Role: 'Chef',
        Category: '2-Week Flagship',
        Notes: 'Specializes in international cuisine'
      },
      {
        Name: 'David Wilson',
        Phone: '0745678901',
        Source: 'Website',
        Role: 'Driver',
        Category: '2-Week Flagship',
        Notes: 'Clean driving record, 5+ years experience'
      },
      {
        Name: 'Sarah Brown',
        Phone: '0756789012',
        Source: 'Instagram',
        Role: 'Caregiver',
        Category: 'Short Course',
        Notes: 'Certified in first aid and CPR'
      }
    ]
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // Name
      { wch: 15 }, // Phone
      { wch: 15 }, // Source
      { wch: 15 }, // Role
      { wch: 18 }, // Category
      { wch: 40 }  // Notes
    ]
    ws['!cols'] = colWidths
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'NICHE Candidates Template')
    
    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0]
    const filename = `NICHE_Candidates_Template_${today}.xlsx`
    
    // Download the file
    XLSX.writeFile(wb, filename)
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
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Import Excel"
          >
            <Upload className="w-4 h-4" />
          </button>
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
                              // Status updated successfully - no toast needed
                            } catch (error: any) {
                              console.error('Error updating status:', error)
                              // Could show error in a warning card if needed
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
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      // Check for duplicates when name changes
                      if (e.target.value.length >= 3 && formData.role) {
                        checkDuplicates(formData.phone, e.target.value, formData.role)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                  {duplicateWarning.name && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-yellow-800 font-medium text-sm">
                              ⚠️ SIMILAR NAME + ROLE FOUND
                            </p>
                            <p className="text-yellow-700 text-sm mt-1">
                              {duplicateWarning.name}
                            </p>
                          </div>
                        </div>
                        {duplicateWarning.nameRecord && (
                          <button
                            type="button"
                            onClick={() => {
                              setDuplicateRecord(duplicateWarning.nameRecord)
                              setShowDuplicateModal(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-medium ml-3 flex-shrink-0"
                          >
                            View Record
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => {
                      console.log('Phone changed to:', value) // Debug log
                      setFormData({ ...formData, phone: value })
                      // Clear previous warnings immediately when typing
                      if (value !== formData.phone) {
                        setDuplicateWarning({})
                      }
                    }}
                    required
                  />
                  
                  {checkingDuplicates && (
                    <div className="flex items-center text-blue-600 text-sm mt-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking for duplicates...
                    </div>
                  )}
                  {duplicateWarning.phone && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-red-800 font-medium text-sm">
                              ⚠️ DUPLICATE PHONE NUMBER DETECTED
                            </p>
                            <p className="text-red-700 text-sm mt-1">
                              {duplicateWarning.phone}
                            </p>
                          </div>
                        </div>
                        {duplicateWarning.phoneRecord && (
                          <button
                            type="button"
                            onClick={async () => {
                              console.log('View Record clicked:', duplicateWarning.phoneRecord) // Debug log
                              setDuplicateRecord(duplicateWarning.phoneRecord)
                              
                              // Load notes based on table source
                              if (duplicateWarning.phoneRecord.table_source === 'niche_candidates') {
                                try {
                                  const { data: notes } = await supabase
                                    .from('niche_candidate_notes')
                                    .select('*')
                                    .eq('niche_candidate_id', duplicateWarning.phoneRecord.id)
                                    .order('created_at', { ascending: false })
                                  setDuplicateRecordNotes(notes || [])
                                } catch (error) {
                                  console.error('Error loading niche notes:', error)
                                  setDuplicateRecordNotes([])
                                }
                              } else if (duplicateWarning.phoneRecord.table_source === 'candidates') {
                                try {
                                  const { data: notes } = await supabase
                                    .from('candidate_notes')
                                    .select('*')
                                    .eq('candidate_id', duplicateWarning.phoneRecord.id)
                                    .order('created_at', { ascending: false })
                                  setDuplicateRecordNotes(notes || [])
                                } catch (error) {
                                  console.error('Error loading candidate notes:', error)
                                  setDuplicateRecordNotes([])
                                }
                              } else {
                                setDuplicateRecordNotes([])
                              }
                              
                              setShowDuplicateModal(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-medium ml-3 flex-shrink-0"
                          >
                            View Record
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
                    onChange={(e) => {
                      setFormData({ ...formData, role: e.target.value })
                      // Check for duplicates when role changes
                      if (formData.name.length >= 3 && e.target.value) {
                        checkDuplicates(formData.phone, formData.name, e.target.value)
                      }
                    }}
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
                      // Show error in console instead of toast
                      console.error('Please select a date')
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
                      
                      // Interview scheduled successfully
                      setScheduleModal({ open: false, candidate: null, dateOnly: '' })
                    } catch (error: any) {
                      console.error('Error scheduling interview:', error)
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

      {/* View Duplicate Record Modal - Enhanced */}
      {showDuplicateModal && duplicateRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Existing Record Found
                </h2>
                <button
                  onClick={() => {
                    console.log('Closing duplicate modal') // Debug log
                    setShowDuplicateModal(false)
                    setDuplicateRecord(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Header */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-nestalk-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {duplicateRecord.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{duplicateRecord.name}</h3>
                      {duplicateRecord.role && (
                        <p className="text-sm text-gray-600">{duplicateRecord.role}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact & Status Information */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Phone:</span>
                        <span className="text-sm text-gray-900 font-mono">{duplicateRecord.phone}</span>
                      </div>
                      {duplicateRecord.role && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Role:</span>
                          <span className="text-sm text-gray-900">{duplicateRecord.role}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <StatusBadge 
                          status={duplicateRecord.status || (duplicateRecord.reason ? 'BLACKLISTED' : 'New Inquiry')} 
                          type="niche_candidate" 
                        />
                      </div>
                      {duplicateRecord.email && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Email:</span>
                          <span className="text-sm text-gray-900">{duplicateRecord.email}</span>
                        </div>
                      )}
                      {duplicateRecord.age && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Age:</span>
                          <span className="text-sm text-gray-900">{duplicateRecord.age}</span>
                        </div>
                      )}
                      {duplicateRecord.source && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Source:</span>
                          <span className="text-sm text-gray-900">{duplicateRecord.source}</span>
                        </div>
                      )}
                      {duplicateRecord.reason && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Blacklist Reason:</span>
                          <span className="text-sm text-red-600 font-medium">{duplicateRecord.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline - Only if inquiry_date exists */}
                {duplicateRecord.inquiry_date && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      Timeline
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Inquiry Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(duplicateRecord.inquiry_date).toLocaleDateString()}
                        </span>
                      </div>
                      {duplicateRecord.created_at && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Created:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(duplicateRecord.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {duplicateRecord.scheduled_date && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Scheduled:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(duplicateRecord.scheduled_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes - Show if qualification_notes exists OR if there are notes from notes table */}
                {(duplicateRecord.qualification_notes || duplicateRecordNotes.length > 0) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Notes & Comments</h4>
                    <div className="space-y-3">
                      {duplicateRecord.qualification_notes && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium text-gray-700 mb-1">Qualification Notes:</p>
                          <p className="text-sm text-gray-700">{duplicateRecord.qualification_notes}</p>
                        </div>
                      )}
                      {duplicateRecordNotes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Activity Notes ({duplicateRecordNotes.length}):</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {duplicateRecordNotes.slice(0, 5).map((note, index) => (
                              <div key={note.id || index} className="bg-blue-50 p-2 rounded text-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-blue-900">{note.created_by || 'Unknown'}</span>
                                  <span className="text-blue-600 text-xs">
                                    {new Date(note.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-blue-800">{note.note}</p>
                              </div>
                            ))}
                            {duplicateRecordNotes.length > 5 && (
                              <p className="text-xs text-gray-500 text-center">... and {duplicateRecordNotes.length - 5} more notes</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning Message */}
                {duplicateRecord.status === 'BLACKLISTED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-red-800 font-medium text-sm">
                          ⚠️ This person is BLACKLISTED
                        </p>
                        <p className="text-red-700 text-sm mt-1">
                          Adding this person is not recommended due to blacklist status.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setDuplicateRecord(null)
                    setDuplicateRecordNotes([])
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Import NICHE Candidates
                </h2>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportData([])
                    setImportPreview({ toAdd: [], toSkip: [] })
                    setImportStep('upload')
                    setImportProgress(0)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {importStep === 'upload' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-blue-900">Excel Format Required:</h3>
                      <button
                        onClick={downloadTemplate}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download Template
                      </button>
                    </div>
                    <div className="text-sm text-blue-800">
                      <p className="mb-2">Your Excel file must have these columns (case-sensitive):</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Name*</strong> - Full name (required)</li>
                        <li><strong>Phone*</strong> - Phone number (required)</li>
                        <li><strong>Source*</strong> - One of: {sourceOptions.join(', ')}</li>
                        <li><strong>Role*</strong> - One of: {roleOptions.join(', ')}</li>
                        <li><strong>Category*</strong> - Either "2-Week Flagship" or "Short Course"</li>
                        <li><strong>Notes</strong> - Optional qualification notes</li>
                      </ul>
                      <p className="mt-2 text-blue-700 font-medium">💡 Download the template above for the correct format with sample data!</p>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">Upload Excel File</p>
                      <p className="text-gray-600">Choose an Excel file (.xlsx, .xls) to import</p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImportFile(file)
                          handleImportFile(file)
                        }
                      }}
                      className="mt-4"
                    />
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-900 mb-2">
                        ✅ To Add ({importPreview.toAdd.length})
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {importPreview.toAdd.map((row, index) => (
                          <div key={index} className="bg-white p-2 rounded border text-sm">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-gray-600">{row.phone} • {row.role} • {row.source}</div>
                            <div className="text-blue-600 text-xs">{row.category}</div>
                            {row.notes && (
                              <div className="text-gray-500 text-xs mt-1 italic">Notes: {row.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-900 mb-2">
                        ⚠️ To Skip ({importPreview.toSkip.length})
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {importPreview.toSkip.map((row, index) => (
                          <div key={index} className="bg-white p-2 rounded border text-sm">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-gray-600">{row.phone} • {row.role}</div>
                            {row.notes && (
                              <div className="text-gray-500 text-xs mt-1 italic">Notes: {row.notes}</div>
                            )}
                            <div className="text-red-600 text-xs mt-1">{row.skipReason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => {
                        setImportStep('upload')
                        setImportFile(null)
                        setImportData([])
                        setImportPreview({ toAdd: [], toSkip: [] })
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Back to Upload
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={importPreview.toAdd.length === 0}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Import {importPreview.toAdd.length} Candidates
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'importing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Candidates...</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600">{importProgress}% Complete</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}