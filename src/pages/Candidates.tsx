﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Users, Phone, Calendar, Edit, CheckCircle, Clock, Upload, Eye } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'

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
    status: 'PENDING' as 'PENDING' | 'INTERVIEW_SCHEDULED' | 'LOST',
    scheduledDateOnly: ''
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

  // row action state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; candidate: Candidate | null; dateOnly: string }>(
    { open: false, candidate: null, dateOnly: '' }
  )

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  const statusOptions = ['PENDING', 'INTERVIEW_SCHEDULED', 'WON', 'LOST', 'BLACKLISTED']
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']

  useEffect(() => {
    loadCandidates()
    
    // Set up real-time subscription for candidates table
    const candidatesSubscription = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'candidates'
        },
        (payload) => {
          console.log('Candidates table change detected:', payload)
          // Reload candidates when any change occurs
          loadCandidates()
        }
      )
      .subscribe()

    // Set up real-time subscription for interviews table to catch status changes
    const interviewsSubscription = supabase
      .channel('interviews-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'interviews'
        },
        (payload) => {
          console.log('Interviews table change detected:', payload)
          // Reload candidates when interview changes might affect candidate status
          loadCandidates()
        }
      )
      .subscribe()

    // Cleanup subscriptions on component unmount
    return () => {
      candidatesSubscription.unsubscribe()
      interviewsSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, filterStatus, dateRange])

  const loadCandidates = async () => {
    setLoading(true)
    showToast('Loading candidates...', 'loading')
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .neq('status', 'ARCHIVED')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates(data || [])
      showToast('Candidates loaded successfully', 'success')
    } catch (error) {
      console.error('Error loading candidates:', error)
      showToast('Failed to load candidates', 'error')
    } finally {
      setLoading(false)
    }
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
      filtered = filtered.filter(candidate => candidate.status === filterStatus)
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(c => {
        const d = new Date(c.created_at).toISOString().split('T')[0]
        return d >= dateRange.start && d <= dateRange.end
      })
    }

    setFilteredCandidates(filtered)
  }

  const updateLocalCandidate = (id: string, updater: (c: Candidate) => Candidate) => {
    setCandidates(prev => prev.map(c => (c.id === id ? updater(c) : c)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    showToast(selectedCandidate ? 'Updating candidate...' : 'Adding new candidate...', 'loading')
    try {
      // Check if trying to edit a candidate with INTERVIEW_SCHEDULED status
      if (selectedCandidate && selectedCandidate.status === 'INTERVIEW_SCHEDULED') {
        showToast('Cannot edit candidates with scheduled interviews. Please use the Interviews page.', 'error')
        setSubmitting(false)
        return
      }

      let scheduledIso: string | null = null
      if (formData.status === 'INTERVIEW_SCHEDULED' && formData.scheduledDateOnly) {
        const d = new Date(formData.scheduledDateOnly)
        d.setHours(14, 0, 0, 0)
        scheduledIso = d.toISOString()
      }

      if (selectedCandidate) {
        // Prevent status change to INTERVIEW_SCHEDULED for existing candidates without proper date
        if (formData.status === 'INTERVIEW_SCHEDULED' && !scheduledIso) {
          showToast('Please provide a scheduled date for the interview', 'error')
          setSubmitting(false)
          return
        }

        const payload: any = { 
          name: formData.name, 
          phone: formData.phone, 
          source: formData.source,
          role: formData.role, 
          status: formData.status,
          scheduled_date: scheduledIso
        }
        
        const { error } = await supabase.from('candidates').update(payload).eq('id', selectedCandidate.id)
        if (error) {
          if (error.message.includes('active interview exists')) {
            showToast('Cannot modify this candidate - please manage from Interviews page', 'error')
            setSubmitting(false)
            return
          }
          throw error
        }

        // Log the activity for candidate edit
        if (staff?.id && staff?.name) {
          const oldStatus = selectedCandidate.status
          const newStatus = formData.status
          
          if (oldStatus !== newStatus) {
            await ActivityLogger.logStatusChange(
              staff.id,
              'candidate',
              selectedCandidate.id,
              formData.name,
              oldStatus,
              newStatus,
              staff.name
            )
          } else {
            await ActivityLogger.logEdit(
              staff.id,
              'candidate',
              selectedCandidate.id,
              formData.name,
              staff.name
            )
          }
        }

        // If status changed to INTERVIEW_SCHEDULED, create interview record
        if (formData.status === 'INTERVIEW_SCHEDULED' && scheduledIso) {
          const { error: interviewError } = await supabase.from('interviews').insert({
            candidate_id: selectedCandidate.id,
            date_time: scheduledIso,
            location: 'Office',
            assigned_staff: user?.id,
            attended: false,
            outcome: null,
            notes: '',
            status: 'scheduled'
          })
          if (interviewError) {
            console.warn('Interview creation failed:', interviewError)
            // Don't fail the whole operation, just warn
          }
        }

        await supabase.from('updates').insert({
          linked_to_type: 'candidate',
          linked_to_id: selectedCandidate.id,
          user_id: user?.id,
          update_text: `Updated candidate ${formData.name}${formData.status === 'INTERVIEW_SCHEDULED' ? ' and scheduled interview' : ''}`,
        })

        updateLocalCandidate(selectedCandidate.id, c => ({ ...c, ...payload }))
        setShowModal(false)
        showToast(`Candidate ${formData.name} updated successfully`, 'success')
      } else {
        // Adding new candidate
        if (!formData.name.trim() || !formData.phone.trim() || !formData.role.trim()) {
          showToast('Please fill in all required fields', 'error')
          setSubmitting(false)
          return
        }

        const insertPayload: any = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          source: formData.source || 'Referral',
          role: formData.role,
          status: formData.status,
          inquiry_date: new Date().toISOString().split('T')[0],
          assigned_to: user?.id,
          scheduled_date: scheduledIso
        }
        
        const { data, error } = await supabase.from('candidates').insert(insertPayload).select('*').single()
        if (error) {
          console.error('Insert error:', error)
          if (error.code === '23505') { // Unique constraint violation
            showToast('A candidate with this phone number already exists', 'error')
          } else {
            showToast(`Failed to add candidate: ${error.message}`, 'error')
          }
          setSubmitting(false)
          return
        }
        
        // Log the activity for candidate creation
        if (staff?.id && staff?.name) {
          await ActivityLogger.logCreate(
            staff.id,
            'candidate',
            data.id,
            formData.name,
            staff.name
          )
        }

        // If status is INTERVIEW_SCHEDULED, create interview record
        if (formData.status === 'INTERVIEW_SCHEDULED' && scheduledIso) {
          const { error: interviewError } = await supabase.from('interviews').insert({
            candidate_id: data.id,
            date_time: scheduledIso,
            location: 'Office',
            assigned_staff: user?.id,
            attended: false,
            outcome: null,
            notes: '',
            status: 'scheduled'
          })
          if (interviewError) {
            console.warn('Interview creation failed:', interviewError)
            // Don't fail the whole operation since candidate was created successfully
          }
        }

        await supabase.from('updates').insert({
          linked_to_type: 'candidate',
          linked_to_id: data.id,
          user_id: user?.id,
          update_text: `Added candidate ${formData.name}${scheduledIso ? ' with interview scheduled' : ''}`,
        })

        setCandidates(prev => [data, ...prev])
        setShowModal(false)
        showToast(`Candidate ${formData.name} added successfully`, 'success')
      }
      resetForm()
    } catch (error) {
      console.error('Error saving candidate:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showToast(`Failed to save candidate: ${errorMessage}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetPending = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'PENDING', scheduled_date: null })
        .eq('id', candidate.id)
      if (error) throw error
      await supabase.from('updates').insert({
        linked_to_type: 'candidate',
        linked_to_id: candidate.id,
        user_id: user?.id,
        update_text: `Marked as PENDING`,
      })
      updateLocalCandidate(candidate.id, c => ({ ...c, status: 'PENDING', scheduled_date: null }))
    } catch (error) {
      console.error('Error updating status to pending:', error)
    }
  }

  const openSchedule = (candidate: Candidate) => {
    setScheduleModal({ open: true, candidate, dateOnly: '' })
  }

  const confirmSchedule = async () => {
    if (!scheduleModal.candidate || !scheduleModal.dateOnly) return
    const candidate = scheduleModal.candidate
    try {
      const d = new Date(scheduleModal.dateOnly)
      d.setHours(14, 0, 0, 0)
      const iso = d.toISOString()
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'INTERVIEW_SCHEDULED', scheduled_date: iso })
        .eq('id', candidate.id)
      if (error) throw error

      const { error: err2 } = await supabase.from('interviews').insert({
        candidate_id: candidate.id,
        date_time: iso,
        location: 'Office',
        assigned_staff: user?.id,
        attended: false,
        outcome: null,
        notes: ''
      })
      if (err2) throw err2

      await supabase.from('updates').insert({
        linked_to_type: 'candidate',
        linked_to_id: candidate.id,
        user_id: user?.id,
        update_text: `Interview scheduled for ${candidate.name} on ${d.toDateString()} 2:00 PM`,
      })

      updateLocalCandidate(candidate.id, c => ({ ...c, status: 'INTERVIEW_SCHEDULED', scheduled_date: iso }))
      setScheduleModal({ open: false, candidate: null, dateOnly: '' })
    } catch (error) {
      console.error('Error scheduling interview:', error)
      alert('Failed to schedule interview')
    }
  }

  const handleMarkAsWon = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'WON' })
        .eq('id', candidate.id)

      if (error) throw error

      await supabase.from('updates').insert({
        linked_to_type: 'candidate',
        linked_to_id: candidate.id,
        user_id: user?.id,
        update_text: `Candidate marked as WON`,
      })

      updateLocalCandidate(candidate.id, c => ({ ...c, status: 'WON' }))
      showToast(`${candidate.name} marked as Won`, 'success')
    } catch (error) {
      console.error('Error marking candidate as won:', error)
      showToast('Failed to mark candidate as won', 'error')
    }
  }

  const handleMarkAsLost = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'LOST' })
        .eq('id', candidate.id)

      if (error) throw error

      await supabase.from('updates').insert({
        linked_to_type: 'candidate',
        linked_to_id: candidate.id,
        user_id: user?.id,
        update_text: `Candidate marked as LOST`,
      })

      updateLocalCandidate(candidate.id, c => ({ ...c, status: 'LOST' }))
    } catch (error) {
      console.error('Error marking candidate as lost:', error)
    }
  }

  const handleMarkAsBlacklisted = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'BLACKLISTED' })
        .eq('id', candidate.id)

      if (error) throw error

      await supabase.from('updates').insert({
        linked_to_type: 'candidate',
        linked_to_id: candidate.id,
        user_id: user?.id,
        update_text: `Candidate marked as BLACKLISTED`,
      })

      updateLocalCandidate(candidate.id, c => ({ ...c, status: 'BLACKLISTED' }))
    } catch (error) {
      console.error('Error marking candidate as blacklisted:', error)
    }
  }

  const handleViewNotes = async (candidate: Candidate) => {
    setSelectedCandidateForNotes(candidate)
    setShowNotesModal(true)
    
    try {
      const { data, error } = await supabase
        .from('candidate_notes')
        .select('*, users(name)')
        .eq('candidate_id', candidate.id)
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
        .from('candidate_notes')
        .insert({
          candidate_id: selectedCandidateForNotes.id,
          user_id: user?.id,
          note: newNote.trim(),
          created_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewNotes(selectedCandidateForNotes)
      showToast('Note added successfully', 'success')
    } catch (error) {
      console.error('Error adding note:', error)
      showToast('Failed to add note', 'error')
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
    const csvContent = `Name,Phone,Source,Role,Status,Scheduled Date (YYYY-MM-DD)\nJohn Doe,555-1234,Referral,Nanny,PENDING,\nJane Smith,555-5678,TikTok,Chef,INTERVIEW_SCHEDULED,2025-09-15\nMary Johnson,555-9999,Youtube,Housekeeper,WON,\nSarah Wilson,555-7777,Facebook,Driver,LOST,`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'candidate_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

      // Helper function to parse CSV rows properly
      const parseCSVRow = (row: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim())
        return result
      }

      const header = rows[0]
      const dataRows = rows.slice(1)
      
      // Parse header row
      const headerCols = parseCSVRow(header).map(s => s.trim().toLowerCase())
      const nameIdx = headerCols.findIndex(col => col.includes('name'))
      const phoneIdx = headerCols.findIndex(col => col.includes('phone'))
      const sourceIdx = headerCols.findIndex(col => col.includes('source'))
      const roleIdx = headerCols.findIndex(col => col.includes('role'))
      const statusIdx = headerCols.findIndex(col => col.includes('status'))
      const schedIdx = headerCols.findIndex(col => col.includes('scheduled') || col.includes('date'))
      
      if (nameIdx === -1 || phoneIdx === -1 || roleIdx === -1) {
        alert('CSV missing required columns. Please ensure your CSV has columns for Name, Phone, and Role')
        return
      }

      console.log('CSV Headers found:', { nameIdx, phoneIdx, roleIdx, statusIdx, schedIdx })
      console.log('Header columns:', headerCols)

      // fetch existing phones to avoid duplicates
      const { data: existing, error: fetchError } = await supabase.from('candidates').select('phone')
      if (fetchError) {
        console.error('Error fetching existing candidates:', fetchError)
        alert('Error checking for duplicates. Please try again.')
        return
      }
      const existingSet = new Set((existing || []).map(r => r.phone))

      const inserts: any[] = []
      const errors: string[] = []
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        if (!row.trim()) continue
        
        try {
          const parts = parseCSVRow(row)
          const name = parts[nameIdx]?.trim().replace(/"/g, '')
          const phone = parts[phoneIdx]?.trim().replace(/"/g, '')
          const source = parts[sourceIdx]?.trim().replace(/"/g, '') || 'Referral'
          const role = parts[roleIdx]?.trim().replace(/"/g, '') || 'Caregiver'
          let status = (parts[statusIdx]?.trim().replace(/"/g, '') || '').toUpperCase()
          const sched = parts[schedIdx]?.trim().replace(/"/g, '')

          console.log(`Row ${i + 2}:`, { name, phone, role, status, sched })

          // Validate required fields
          if (!name) {
            errors.push(`Row ${i + 2}: Name is required`)
            continue
          }
          if (!phone) {
            errors.push(`Row ${i + 2}: Phone is required`)
            continue
          }
          if (!role) {
            errors.push(`Row ${i + 2}: Role is required`)
            continue
          }

          // Check for duplicates
          if (existingSet.has(phone)) {
            errors.push(`Row ${i + 2}: Phone number ${phone} already exists`)
            continue
          }

          // Default to PENDING if date is missing
          if (!sched && status === 'INTERVIEW_SCHEDULED') status = 'PENDING'
          if (!status) status = 'PENDING'

          // Validate role
          if (!roleOptions.includes(role)) {
            errors.push(`Row ${i + 2}: Invalid role "${role}". Must be one of: ${roleOptions.join(', ')}`)
            continue
          }

          // Validate source
          if (!sourceOptions.includes(source)) {
            errors.push(`Row ${i + 2}: Invalid source "${source}". Must be one of: ${sourceOptions.join(', ')}`)
            continue
          }

          // Validate status
          const validStatuses = ['PENDING', 'INTERVIEW_SCHEDULED', 'WON', 'LOST', 'BLACKLISTED']
          if (!validStatuses.includes(status)) {
            errors.push(`Row ${i + 2}: Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`)
            continue
          }

          let scheduled_date = null
          if (status === 'INTERVIEW_SCHEDULED' && sched) {
            const d = new Date(sched)
            if (isNaN(d.getTime())) {
              errors.push(`Row ${i + 2}: Invalid date format "${sched}". Use YYYY-MM-DD format`)
              continue
            }
            d.setHours(14, 0, 0, 0)
            scheduled_date = d.toISOString()
          }

          inserts.push({ 
            name, 
            phone, 
            source,
            role, 
            status, 
            assigned_to: user?.id, 
            scheduled_date,
            inquiry_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          })
        } catch (rowError) {
          errors.push(`Row ${i + 2}: Error parsing row - ${rowError}`)
        }
      }

      if (errors.length > 0) {
        alert('Found ' + errors.length + ' errors:\n\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...and more' : ''))
        return
      }

      if (inserts.length === 0) {
        alert('No valid rows to insert. Please check your CSV data.')
        return
      }

      console.log(`Inserting ${inserts.length} candidates:`, inserts)

      const { data, error } = await supabase.from('candidates').insert(inserts).select('id, status, scheduled_date')
      if (error) {
        console.error('Database insert error:', error)
        alert(`Database error: ${error.message}`)
        return
      }

      // Log the bulk upload activity
      if (staff?.id && staff?.name) {
        await ActivityLogger.logBulkUpload(
          staff.id,
          'candidate',
          inserts.length,
          staff.name
        )
      }

      const scheduledToCreate = (data || []).filter(d => d.status === 'INTERVIEW_SCHEDULED' && d.scheduled_date)
      if (scheduledToCreate.length > 0) {
        const { error: interviewError } = await supabase.from('interviews').insert(
          scheduledToCreate.map(d => ({
            candidate_id: d.id,
            date_time: d.scheduled_date,
            assigned_staff: user?.id,
            attended: false,
            outcome: null,
            notes: ''
          }))
        )
        if (interviewError) {
          console.error('Error creating interviews:', interviewError)
          alert(`Candidates added but failed to create interviews: ${interviewError.message}`)
        }
      }

      await loadCandidates()
      setShowBulkUpload(false)
      setUploadFile(null)
      alert(`Successfully uploaded ${inserts.length} candidates${scheduledToCreate.length > 0 ? ` and created ${scheduledToCreate.length} interviews` : ''}`)
    } catch (error) {
      console.error('Error bulk uploading candidates:', error)
      alert(`Error uploading candidates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', phone: '', source: '', role: '', status: 'PENDING', scheduledDateOnly: '' })
    setSelectedCandidate(null)
  }

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedCandidates.length === 0) return
    
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: bulkStatus })
        .in('id', selectedCandidates)
      
      if (error) throw error
      
      await loadCandidates()
      setSelectedCandidates([])
      setBulkStatus('')
      showToast(`Updated ${selectedCandidates.length} candidates to ${bulkStatus}`, 'success')
    } catch (error) {
      console.error('Error updating bulk status:', error)
      showToast('Failed to update candidates', 'error')
    }
  }

  const toggleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id))
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
      {/* Header */}
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

      {/* Search, Filter */}
      <div className="flex flex-col gap-3">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={statusOptions}
          placeholder="Search by name, phone, or role..."
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Date added:</span>
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

      {/* Bulk Actions */}
      {selectedCandidates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedCandidates.length} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm"
            >
              <option value="">Change status to...</option>
              <option value="PENDING">PENDING</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
              <option value="BLACKLISTED">BLACKLISTED</option>
            </select>
            <button
              onClick={handleBulkStatusChange}
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
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                    <StatusBadge status={candidate.status} type="candidate" />
                      {candidate.status === 'INTERVIEW_SCHEDULED' && candidate.scheduled_date && (
                        <span className="inline-flex items-center text-xs text-gray-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDisplayDate(candidate.scheduled_date)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewNotes(candidate)}
                      className="text-nestalk-primary hover:text-nestalk-primary/80"
                      title="View/Add Notes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDisplayDate(candidate.inquiry_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative inline-flex items-center gap-2">
                    <button
                        onClick={() => {
                          // Prevent editing candidates with INTERVIEW_SCHEDULED status
                          if (candidate.status === 'INTERVIEW_SCHEDULED') {
                            showToast('Cannot edit candidates with scheduled interviews. Please use the Interviews page to make changes.', 'error')
                            return
                          }
                          setShowModal(true)
                          setSelectedCandidate(candidate)
                          setFormData({
                            name: candidate.name,
                            phone: candidate.phone,
                            source: candidate.source || 'Referral',
                            role: candidate.role,
                            status: candidate.status as any,
                            scheduledDateOnly: candidate.scheduled_date ? new Date(candidate.scheduled_date).toISOString().split('T')[0] : ''
                          })
                        }}
                        className={`${candidate.status === 'INTERVIEW_SCHEDULED' 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-nestalk-primary hover:text-nestalk-primary/80'
                        }`}
                        title={candidate.status === 'INTERVIEW_SCHEDULED' 
                          ? 'Cannot edit - use Interviews page' 
                          : 'Edit'
                        }
                        disabled={candidate.status === 'INTERVIEW_SCHEDULED'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <select
                        onChange={(e) => {
                          const v = e.target.value
                          // Prevent status changes for INTERVIEW_SCHEDULED candidates
                          if (candidate.status === 'INTERVIEW_SCHEDULED') {
                            showToast('Cannot change status - please use Interviews page to manage scheduled candidates', 'error')
                            e.currentTarget.selectedIndex = 0
                            return
                          }
                          if (v === 'PENDING') handleSetPending(candidate)
                          if (v === 'INTERVIEW_SCHEDULED') openSchedule(candidate)
                          if (v === 'WON') handleMarkAsWon(candidate)
                          if (v === 'LOST') handleMarkAsLost(candidate)
                          if (v === 'BLACKLISTED') handleMarkAsBlacklisted(candidate)
                          e.currentTarget.selectedIndex = 0
                        }}
                        className={`px-2 py-1 border border-gray-300 rounded text-sm bg-white ${
                          candidate.status === 'INTERVIEW_SCHEDULED' 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : ''
                        }`}
                        defaultValue=""
                        title={candidate.status === 'INTERVIEW_SCHEDULED' 
                          ? 'Use Interviews page to manage this candidate'
                          : 'Actions'
                        }
                        disabled={candidate.status === 'INTERVIEW_SCHEDULED'}
                      >
                        <option value="" disabled>Actions</option>
                        <option value="PENDING">Pending</option>
                        <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                        <option value="BLACKLISTED">Blacklisted</option>
                      </select>
                    </div>
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

      {/* Add/Edit Modal */}
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

                {formData.status === 'INTERVIEW_SCHEDULED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                    <input
                      type="date"
                      value={formData.scheduledDateOnly}
                      onChange={(e) => setFormData({ ...formData, scheduledDateOnly: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time defaults to 2:00 PM</p>
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

      {/* Schedule Interview Modal */}
      {scheduleModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setScheduleModal({ open: false, candidate: null, dateOnly: '' })}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule Interview</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleModal.dateOnly}
                    onChange={(e) => setScheduleModal(prev => ({ ...prev, dateOnly: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time defaults to 2:00 PM</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setScheduleModal({ open: false, candidate: null, dateOnly: '' })}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSchedule}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Upload Candidates
              </h2>

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
                    type="button"
                    onClick={downloadTemplate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Template
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

      {/* Notes Modal */}
      {showNotesModal && selectedCandidateForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notes - {selectedCandidateForNotes.name}
              </h2>
              
              {/* Add Note */}
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
              
              {/* Notes List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {candidateNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  candidateNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{note.users?.name || 'Unknown'}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(note.created_at).toLocaleString()}
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

    </div>
  )
}