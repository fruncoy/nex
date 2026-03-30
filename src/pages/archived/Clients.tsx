import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Plus, Building2, Eye, Edit, AlertTriangle, X, Pencil, Upload } from 'lucide-react'
import { PhoneInput } from '../components/ui/PhoneInput'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'
import { StatusHistoryLogger } from '../lib/statusHistory'

interface Lead {
  id: string
  name: string
  phone: string
  gmail: string
  source: string
  want_to_hire: string
  status: string
  inquiry_date: string
  lost_reason: string | null
  lost_reason_other: string | null
  custom_reminder_datetime: string | null
  created_at: string
  updated_at: string
}

export function Clients() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedLeadForReminder, setSelectedLeadForReminder] = useState<Lead | null>(null)
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<Lead | null>(null)
  const [leadNotes, setLeadNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gmail: '',
    source: '',
    want_to_hire: '',
    status: 'Active - Reviewing Profiles',
    inquiry_date: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  // Client status options only
  const clientStatusOptions = [
    'Active - Reviewing Profiles',
    'Active - Conducting Trials', 
    'Active - Payment Pending',
    'Active - But Dormant',
    'Won',
    'Lost - Disappointed With Profiles',
    'Lost - Conflict of Interest',
    'Lost - Competition'
  ]
  // Lost reasons for leads
  const lostReasons = ['Budget', 'Competition', 'Ghosted', 'Other reason']
  
  // Source options
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']
  
  // Role options
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper', 'Uniforms']

  // Load unread notes counts
  const loadUnreadCounts = async () => {
    if (!staff?.name) return
    
    const counts: Record<string, number> = {}
    const totalCounts: Record<string, number> = {}
    
    for (const lead of leads) {
      // Get unread count
      const { data: unreadData } = await supabase.rpc('get_unread_notes_count', {
        entity_type: 'client',
        entity_id: lead.id,
        user_name: staff.name
      })
      counts[lead.id] = unreadData || 0
      
      // Get total note count
      const { data: totalData } = await supabase
        .from('client_notes')
        .select('id', { count: 'exact' })
        .eq('client_id', lead.id)
      
      totalCounts[lead.id] = totalData?.length || 0
    }
    
    setUnreadCounts(counts)
    setNoteCounts(totalCounts)
  }

  // Helper function to get time until reminder
  const getTimeUntilReminder = (reminderDateTime: string) => {
    const now = new Date()
    const reminder = new Date(reminderDateTime)
    const diffMs = reminder.getTime() - now.getTime()
    
    if (diffMs <= 0) {
      return { overdue: true, text: 'Overdue' }
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return { overdue: false, text: `${days}d ${hours}h remaining` }
    } else if (hours > 0) {
      return { overdue: false, text: `${hours}h remaining` }
    } else {
      return { overdue: true, text: 'Need Attention' }
    }
  }

  // Helper function to check if lead needs attention
  const needsAttention = (lead: Lead): boolean => {
    if (lead.custom_reminder_datetime) {
      const now = new Date()
      const reminderTime = new Date(lead.custom_reminder_datetime)
      if (now >= reminderTime) return true
    }
    return false
  }

  // Convert lead to client
  const convertToClient = async (lead: Lead) => {
    try {
      // Update status to convert lead to client
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          status: 'Active'
        })
        .eq('id', lead.id)

      if (updateError) throw updateError

      // Log activity
      if (staff?.id && staff?.name) {
        await ActivityLogger.logEdit(
          staff.id,
          'client',
          lead.id,
          lead.name,
          staff.name
        )
        
        await StatusHistoryLogger.logStatusChange(
          'client',
          lead.id,
          lead.name,
          lead.status,
          'Active',
          staff.id,
          staff.name,
          'Converted from lead to client'
        )
      }

      await loadLeads()
      showToast(`${lead.name} converted to client successfully`, 'success')
    } catch (error) {
      console.error('Error converting lead to client:', error)
      showToast('Failed to convert lead to client', 'error')
    }
  }

  // Bulk upload functionality
  const downloadTemplate = () => {
    const csvContent = `Name,Phone,Gmail,Source,Want to Hire,Status,Inquiry Date (YYYY-MM-DD)
John Doe,0712345678,john@example.com,Referral,Nanny,Active - Reviewing Profiles,2025-01-15
Jane Smith,0723456789,jane@example.com,TikTok,Chef,Active - Reviewing Profiles,2025-01-14`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      showToast('Please select a CSV file to upload', 'error')
      return
    }

    setSubmitting(true)
    try {
      const text = await uploadFile.text()
      const rows = text.split(/\r?\n/).filter((row: string) => row.trim())
      
      if (rows.length < 2) {
        showToast('CSV file must have at least a header row and one data row', 'error')
        setSubmitting(false)
        return
      }

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
      
      const headerCols = parseCSVRow(header).map(s => s.trim().toLowerCase())
      const nameIdx = headerCols.findIndex(col => col.includes('name'))
      const phoneIdx = headerCols.findIndex(col => col.includes('phone'))
      const gmailIdx = headerCols.findIndex(col => col.includes('gmail') || col.includes('email'))
      const sourceIdx = headerCols.findIndex(col => col.includes('source'))
      const wantToHireIdx = headerCols.findIndex(col => col.includes('want') || col.includes('hire') || col.includes('role'))
      const statusIdx = headerCols.findIndex(col => col.includes('status'))
      const inquiryDateIdx = headerCols.findIndex(col => col.includes('inquiry') && col.includes('date'))
      
      if (inquiryDateIdx === -1) {
        showToast('CSV missing Inquiry Date column. This field is required.', 'error')
        setSubmitting(false)
        return
      }
      
      if (nameIdx === -1 || phoneIdx === -1 || gmailIdx === -1) {
        showToast('CSV missing required columns. Please ensure your CSV has columns for Name, Phone, and Gmail', 'error')
        setSubmitting(false)
        return
      }

      const { data: existing, error: fetchError } = await supabase
        .from('clients')
        .select('phone')
      if (fetchError) {
        console.error('Error fetching existing leads:', fetchError)
        showToast('Error checking for duplicates. Please try again.', 'error')
        setSubmitting(false)
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
          const gmail = parts[gmailIdx]?.trim().replace(/"/g, '')
          const source = parts[sourceIdx]?.trim().replace(/"/g, '') || 'Referral'
          const want_to_hire = parts[wantToHireIdx]?.trim().replace(/"/g, '') || 'Caregiver'
          const status = parts[statusIdx]?.trim().replace(/"/g, '') || 'Pending'
          const inquiry_date = parts[inquiryDateIdx]?.trim().replace(/"/g, '')

          if (!inquiry_date) {
            errors.push(`Row ${i + 2}: Inquiry Date is required`)
            continue
          }

          if (!name || !phone || !gmail) {
            errors.push(`Row ${i + 2}: Missing required fields (Name, Phone, Gmail)`)
            continue
          }

          // Normalize phone for checking duplicates
          let normalizedPhone = phone.replace(/[^0-9+]/g, '')
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '+254' + normalizedPhone.substring(1)
          } else if (normalizedPhone.startsWith('254')) {
            normalizedPhone = '+' + normalizedPhone
          } else if (!normalizedPhone.startsWith('+254')) {
            normalizedPhone = '+254' + normalizedPhone
          }
          
          if (existingSet.has(normalizedPhone)) {
            errors.push(`Row ${i + 2}: Phone number ${normalizedPhone} already exists`)
            continue
          }
          
          existingSet.add(normalizedPhone)

          if (!sourceOptions.includes(source)) {
            errors.push(`Row ${i + 2}: Invalid source '${source}'. Must be one of: ${sourceOptions.join(', ')}`)
            continue
          }

          if (!roleOptions.includes(want_to_hire)) {
            errors.push(`Row ${i + 2}: Invalid role '${want_to_hire}'. Must be one of: ${roleOptions.join(', ')}`)
            continue
          }

          if (!clientStatusOptions.includes(status)) {
            errors.push(`Row ${i + 2}: Invalid status '${status}'. Must be one of: ${clientStatusOptions.join(', ')}`)
            continue
          }

          inserts.push({ 
            name, 
            phone: normalizedPhone, 
            gmail,
            source,
            want_to_hire, 
            status,
            inquiry_date,
            created_at: new Date().toISOString()
          })
        } catch (rowError) {
          errors.push(`Row ${i + 2}: Error parsing row - ${rowError}`)
        }
      }

      if (errors.length > 0) {
        showToast('Found ' + errors.length + ' errors. Check console for details.', 'error')
        console.error('Upload errors:', errors)
        setSubmitting(false)
        return
      }

      if (inserts.length === 0) {
        showToast('No valid rows to insert. Please check your CSV data.', 'error')
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('clients').insert(inserts)
      if (error) {
        console.error('Database insert error:', error)
        showToast(`Database error: ${error.message}`, 'error')
        setSubmitting(false)
        return
      }

      if (staff?.id && staff?.name) {
        await ActivityLogger.logBulkUpload(
          staff.id,
          'lead',
          inserts.length,
          staff.name
        )
      }

      await loadLeads()
      setShowBulkUpload(false)
      setUploadFile(null)
      showToast(`Successfully uploaded ${inserts.length} leads`, 'success')
    } catch (error) {
      console.error('Error bulk uploading leads:', error)
      showToast(`Error uploading leads: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadLeads()
    
    const subscription = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        loadLeads()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_notes' }, () => {
        loadUnreadCounts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (leads.length > 0) {
      loadUnreadCounts()
    }
  }, [leads, staff?.name])

  useEffect(() => {
    filterLeads()
  }, [leads, searchTerm, filterStatus])

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('status', clientStatusOptions)
        .order('created_at', { ascending: false})

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
      showToast('Failed to load leads', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterLeads = () => {
    let filtered = leads

    if (searchTerm) {
      const normalizePhone = (phone: string) => {
        return phone.replace(/[^0-9]/g, '')
      }
      
      const searchPhone = normalizePhone(searchTerm)
      
      filtered = filtered.filter(lead => {
        const nameMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase())
        const gmailMatch = lead.gmail.toLowerCase().includes(searchTerm.toLowerCase())
        const sourceMatch = lead.source?.toLowerCase().includes(searchTerm.toLowerCase())
        const roleMatch = lead.want_to_hire.toLowerCase().includes(searchTerm.toLowerCase())
        
        let phoneMatch = false
        if (searchPhone) {
          const leadPhone = normalizePhone(lead.phone)
          phoneMatch = leadPhone.includes(searchPhone) ||
                      leadPhone.endsWith(searchPhone) ||
                      (searchPhone.startsWith('0') && leadPhone.endsWith(searchPhone.substring(1)))
        }
        
        return nameMatch || phoneMatch || gmailMatch || sourceMatch || roleMatch
      })
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === filterStatus)
    }

    setFilteredLeads(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedLead) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            phone: formData.phone,
            gmail: formData.gmail,
            source: formData.source,
            want_to_hire: formData.want_to_hire,
            status: formData.status,
            inquiry_date: formData.inquiry_date || new Date().toISOString().split('T')[0]
          })
          .eq('id', selectedLead.id)

        if (error) throw error

        if (staff?.id && staff?.name) {
          const oldStatus = selectedLead.status
          const newStatus = formData.status
          
          if (oldStatus !== newStatus) {
            await StatusHistoryLogger.logStatusChange(
              'lead',
              selectedLead.id,
              formData.name,
              oldStatus,
              newStatus,
              staff.id,
              staff.name
            )
          }
          
          await ActivityLogger.logEdit(
            staff.id,
            'lead',
            selectedLead.id,
            formData.name,
            staff.name
          )
        }

        showToast(`Client updated successfully`, 'success')
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            phone: formData.phone,
            gmail: formData.gmail,
            source: formData.source,
            want_to_hire: formData.want_to_hire,
            status: formData.status,
            inquiry_date: formData.inquiry_date || new Date().toISOString().split('T')[0]
          })
          .select()
          .single()

        if (error) throw error
        
        if (staff?.id && staff?.name && data) {
          await ActivityLogger.logCreate(
            staff.id,
            'client',
            data.id,
            formData.name,
            staff.name
          )
          await StatusHistoryLogger.logStatusChange(
            'client',
            data.id,
            formData.name,
            null,
            formData.status,
            staff.id,
            staff.name,
            'Initial status on creation'
          )
        }
        
        showToast(`Client added successfully`, 'success')
      }

      await loadLeads()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving lead:', error)
      showToast('Failed to save lead', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      gmail: '',
      source: '',
      want_to_hire: '',
      status: 'Active - Reviewing Profiles',
      inquiry_date: ''
    })
    setSelectedLead(null)
  }

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead)
    setFormData({
      name: lead.name,
      phone: lead.phone,
      gmail: lead.gmail,
      source: lead.source || 'Referral',
      want_to_hire: lead.want_to_hire,
      status: lead.status,
      inquiry_date: lead.inquiry_date
    })
    setShowModal(true)
  }

  const handleReminderEdit = (lead: Lead) => {
    setSelectedLeadForReminder(lead)
    if (lead.custom_reminder_datetime) {
      const reminderDate = new Date(lead.custom_reminder_datetime)
      setReminderForm({
        date: reminderDate.toISOString().split('T')[0],
        time: reminderDate.toTimeString().slice(0, 5)
      })
    } else {
      setReminderForm({ date: '', time: '09:00' })
    }
    setShowReminderModal(true)
  }

  const handleReminderSave = async () => {
    if (!selectedLeadForReminder) return
    
    try {
      let custom_reminder_datetime = null
      if (reminderForm.date && reminderForm.time) {
        custom_reminder_datetime = `${reminderForm.date}T${reminderForm.time}:00`
      }

      const { error } = await supabase
        .from('clients')
        .update({ custom_reminder_datetime })
        .eq('id', selectedLeadForReminder.id)

      if (error) throw error

      await loadLeads()
      setShowReminderModal(false)
      setSelectedLeadForReminder(null)
      setReminderForm({ date: '', time: '' })
      showToast('Reminder updated successfully', 'success')
    } catch (error) {
      console.error('Error updating reminder:', error)
      showToast('Failed to update reminder', 'error')
    }
  }

  const handleReminderDelete = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ custom_reminder_datetime: null })
        .eq('id', leadId)

      if (error) throw error

      await loadLeads()
      showToast('Reminder cancelled successfully', 'success')
    } catch (error) {
      console.error('Error cancelling reminder:', error)
      showToast('Failed to cancel reminder', 'error')
    }
  }

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedLeads.length === 0) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: bulkStatus })
        .in('id', selectedLeads)
      
      if (error) throw error
      
      await loadLeads()
      setSelectedLeads([])
      setBulkStatus('')
      showToast(`Updated ${selectedLeads.length} leads to ${bulkStatus}`, 'success')
    } catch (error) {
      console.error('Error updating bulk status:', error)
      showToast('Failed to update leads', 'error')
    }
  }

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id))
    }
  }

  const handleViewNotes = async (lead: Lead) => {
    setSelectedLeadForNotes(lead)
    setShowNotesModal(true)
    setLeadNotes([])
    
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', lead.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading notes:', error)
        return
      }
      
      setLeadNotes(data || [])
      
      if (staff?.name && data?.length > 0) {
        for (const note of data) {
          const currentReadBy = note.read_by || {}
          const updatedReadBy = { ...currentReadBy, [staff.name]: new Date().toISOString() }
          
          await supabase
            .from('client_notes')
            .update({ read_by: updatedReadBy })
            .eq('id', note.id)
        }
        
        setUnreadCounts(prev => ({ ...prev, [lead.id]: 0 }))
      }
    } catch (error) {
      console.error('Error in handleViewNotes:', error)
      setLeadNotes([])
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLeadForNotes) return
    
    try {
      const { error } = await supabase
        .from('client_notes')
        .insert({
          client_id: selectedLeadForNotes.id,
          note: newNote.trim(),
          created_by: staff?.name || user?.email || 'Unknown'
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewNotes(selectedLeadForNotes)
      await loadUnreadCounts()
      showToast('Note added successfully', 'success')
    } catch (error) {
      console.error('Error adding note:', error)
      showToast('Failed to add note', 'error')
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage active clients and their service progress</p>
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
            Add Client
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={clientStatusOptions}
        placeholder="Search by name, phone, gmail, source, or role..."
      />

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedLeads.length} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm"
            >
              <option value="">Change status to...</option>
              {clientStatusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={() => setSelectedLeads([])}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Want to Hire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Reminder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead, index) => {
                const hasAttention = needsAttention(lead)
                return (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${hasAttention ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads(prev => [...prev, lead.id])
                          } else {
                            setSelectedLeads(prev => prev.filter(id => id !== lead.id))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {hasAttention && <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />}
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.source || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.want_to_hire}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.status} type="lead" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {lead.custom_reminder_datetime ? (
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 min-w-0 flex-1">
                            <div className="text-xs">
                              {(() => {
                                const timeInfo = getTimeUntilReminder(lead.custom_reminder_datetime)
                                return (
                                  <span className={timeInfo.overdue ? 'text-red-600 font-medium' : 'text-blue-600'}>
                                    {timeInfo.overdue ? '⚠️ Overdue' : `⏰ ${timeInfo.text} remaining`}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No reminder set</span>
                        )}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReminderEdit(lead)}
                            className="text-blue-600 hover:text-blue-800 p-1 border border-blue-300 rounded hover:bg-blue-50"
                            title="Set/Edit Reminder"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {lead.custom_reminder_datetime && (
                            <button
                              onClick={() => handleReminderDelete(lead.id)}
                              className="text-red-600 hover:text-red-800 p-1 border border-red-300 rounded hover:bg-red-50"
                              title="Cancel Reminder"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="relative">
                        <button
                          onClick={() => handleViewNotes(lead)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                          title="View/Add Notes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(unreadCounts[lead.id] || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {unreadCounts[lead.id]}
                          </span>
                        )}
                        {(noteCounts[lead.id] || 0) > 0 && (unreadCounts[lead.id] || 0) === 0 && (
                          <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {noteCounts[lead.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.inquiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(lead)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {lead.status === 'Pending' && (
                          <button
                            onClick={() => convertToClient(lead)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            title="Convert to Client"
                          >
                            Convert
                          </button>
                        )}
                        <select
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            if (newStatus) {
                              try {
                                const oldStatus = lead.status
                                const { error } = await supabase
                                  .from('clients')
                                  .update({ status: newStatus })
                                  .eq('id', lead.id)
                                if (error) throw error
                                
                                setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
                                
                                if (user?.id && staff?.name) {
                                  await supabase.from('activity_logs').insert({
                                    user_id: user.id,
                                    action_type: 'status_change',
                                    entity_type: 'client',
                                    entity_id: lead.id,
                                    entity_name: lead.name,
                                    old_value: oldStatus,
                                    new_value: newStatus,
                                    description: `${staff.name} changed ${lead.name} status from ${oldStatus} to ${newStatus}`
                                  })
                                }
                                
                                showToast(`Status updated to ${newStatus}`, 'success')
                              } catch (error: any) {
                                console.error('Error updating status:', error)
                                showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
                              }
                            }
                            e.target.selectedIndex = 0
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                          defaultValue=""
                        >
                          <option value="" disabled>Update Status</option>
                          {clientStatusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first lead inquiry.'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedLead ? 'Edit Client' : 'Add New Client'}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gmail</label>
                  <input
                    type="email"
                    required
                    value={formData.gmail}
                    onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Want to Hire</label>
                  <select
                    required
                    value={formData.want_to_hire}
                    onChange={(e) => setFormData({ ...formData, want_to_hire: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {clientStatusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inquiry Date (leave blank for today)</label>
                  <input
                    type="date"
                    value={formData.inquiry_date}
                    onChange={(e) => setFormData({ ...formData, inquiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
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
                    {selectedLead ? 'Update' : 'Add'} Client
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Upload Leads
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

                <div className="text-sm text-gray-600">
                  <p className="mb-2">CSV should include columns:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Name (required)</li>
                    <li>Phone (required)</li>
                    <li>Gmail (required)</li>
                    <li>Source (optional, defaults to Referral)</li>
                    <li>Want to Hire (optional, defaults to Caregiver)</li>
                    <li>Status (optional, defaults to Pending)</li>
                    <li>Inquiry Date (required, YYYY-MM-DD)</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex-1 px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Download Template
                  </button>
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
                    disabled={!uploadFile || submitting}
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedLeadForReminder?.custom_reminder_datetime ? 'Edit Reminder' : 'Set Reminder'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={reminderForm.date}
                  onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <select
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleReminderSave}
                disabled={!reminderForm.date || !reminderForm.time}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false)
                  setSelectedLeadForReminder(null)
                  setReminderForm({ date: '', time: '' })
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notes for {selectedLeadForNotes?.name} ({noteCounts[selectedLeadForNotes?.id || ''] || 0} notes)
              </h2>

              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50"
                  >
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      setShowNotesModal(false)
                      setSelectedLeadForNotes(null)
                      setLeadNotes([])
                      setNewNote('')
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {leadNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  leadNotes.map((note) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clients