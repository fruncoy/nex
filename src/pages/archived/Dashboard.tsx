import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SearchFilter } from '../../components/ui/SearchFilter'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Plus, Building2, Eye, Edit, AlertTriangle, X, Pencil, Upload } from 'lucide-react'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ActivityLogger } from '../../lib/activityLogger'
import { formatDateTime } from '../../utils/dateFormat'
import { StatusHistoryLogger } from '../../lib/statusHistory'

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
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle, Plus, User, DollarSign, Calendar, Search, Filter, Grid3X3, List, Clock, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../utils/dateFormat'
import { ActivityLogger } from '../../lib/activityLogger'

interface ConvertedClient {
  id: string
  name: string
  phone: string
  gmail: string
  want_to_hire: string
  placement_fee: number | null
  placement_status: string
}

interface Placement {
  id: string
  client_id: string
  candidate_id: string
  placement_date: string
  salary_amount: number | null
  status: string
  original_placement_id: string | null
  replacement_number: number
  notes: string
  candidate_name?: string
}

export function ConvertedClients() {
  const [clients, setClients] = useState<ConvertedClient[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ConvertedClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [placementFee, setPlacementFee] = useState('')
  const [placementStatus, setPlacementStatus] = useState('Active')
  const [showAddPlacement, setShowAddPlacement] = useState(false)
  const [showAddReplacement, setShowAddReplacement] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [placementNotes, setPlacementNotes] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [placementDate, setPlacementDate] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showEditPlacement, setShowEditPlacement] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const { showToast } = useToast()
  const { staff } = useAuth()

  const placementStatuses = ['Active', 'Lost (Refunded)', 'Lost (No Refund)']
  const placementStatusOptions = ['ACTIVE', 'SUCCESS', 'LOST']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientsRes, placementsRes, candidatesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'Won'),
        supabase.from('placements').select('*, candidates(name)').order('replacement_number'),
        supabase.from('candidates').select('id, name').eq('status', 'WON')
      ])

      setClients(clientsRes.data || [])
      const placementsWithNames = (placementsRes.data || []).map(p => ({
        ...p,
        candidate_name: p.candidates?.name || 'Unknown'
      }))
      setPlacements(placementsWithNames)
      setCandidates(candidatesRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (client: ConvertedClient) => {
    setSelectedClient(client)
    setPlacementFee(client.placement_fee?.toString() || '')
    setPlacementStatus(client.placement_status || 'Active')
    setShowDetailModal(true)
  }

  const handleSavePlacement = async (newFee?: number, newStatus?: string) => {
    if (!selectedClient) return

    try {
      const oldFee = selectedClient.placement_fee
      const oldStatus = selectedClient.placement_status
      const fee = newFee !== undefined ? newFee : (parseFloat(placementFee) || null)
      const status = newStatus || placementStatus

      const { error } = await supabase
        .from('clients')
        .update({
          placement_fee: fee,
          placement_status: status,
          updated_by: staff?.id
        })
        .eq('id', selectedClient.id)

      if (error) throw error

      // Log changes
      if (oldFee !== fee) {
        await ActivityLogger.log({
          userId: staff?.id || '',
          actionType: 'edit',
          entityType: 'client',
          entityId: selectedClient.id,
          entityName: selectedClient.name,
          oldValue: oldFee?.toString() || '0',
          newValue: fee?.toString() || '0',
          description: `Placement fee updated from $${oldFee || 0} to $${fee || 0}`
        })
      }
      if (oldStatus !== status) {
        await ActivityLogger.log({
          userId: staff?.id || '',
          actionType: 'status_change',
          entityType: 'client',
          entityId: selectedClient.id,
          entityName: selectedClient.name,
          oldValue: oldStatus || 'Active',
          newValue: status,
          description: `Placement status changed from ${oldStatus || 'Active'} to ${status}`
        })
      }

      await loadData()
    } catch (error) {
      console.error('Error saving placement:', error)
      showToast('Failed to save placement details', 'error')
    }
  }

  const handleAddPlacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { data: placementData, error } = await supabase
        .from('placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          placement_date: placementDate || new Date().toISOString().split('T')[0],
          salary_amount: parseFloat(salaryAmount) || null,
          notes: placementNotes || null,
          status: 'ACTIVE',
          replacement_number: 0,
          created_by: staff?.id || null
        })
        .select()
        .single()

      if (error) throw error

      // Log placement addition
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'create',
        entityType: 'client',
        entityId: selectedClient.id,
        entityName: selectedClient.name,
        description: `Added initial placement: ${candidateName}. Salary: $${salaryAmount || 'Not specified'}. Notes: ${placementNotes || 'No notes provided'}`
      })

      await loadData()
      setShowAddPlacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      setPlacementDate('')
      showToast('Placement added successfully', 'success')
    } catch (error) {
      console.error('Error adding placement:', error)
      showToast('Failed to add placement', 'error')
    }
  }

  const handleAddReplacement = async () => {
    if (!selectedClient || !selectedCandidate) return

    const clientPlacements = placements.filter(p => p.client_id === selectedClient.id)
    const originalPlacement = clientPlacements.find(p => p.replacement_number === 0)
    
    if (clientPlacements.length >= 3) {
      showToast('Maximum 3 placements allowed', 'error')
      return
    }

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      const replacementNumber = Math.max(...clientPlacements.map(p => p.replacement_number)) + 1
      
      const { data: placementData, error } = await supabase
        .from('placements')
        .insert({
          client_id: selectedClient.id,
          candidate_id: selectedCandidate,
          placement_date: placementDate || new Date().toISOString().split('T')[0],
          salary_amount: parseFloat(salaryAmount) || null,
          status: 'ACTIVE',
          original_placement_id: originalPlacement?.id || null,
          replacement_number: replacementNumber,
          notes: placementNotes
        })
        .select()
        .single()

      if (error) throw error

      // Log replacement addition
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'create',
        entityType: 'client',
        entityId: selectedClient.id,
        entityName: selectedClient.name,
        description: `Added replacement #${replacementNumber}: ${candidateName}. Salary: $${salaryAmount || 'Not specified'}. Reason: ${placementNotes || 'No reason provided'}`
      })

      await loadData()
      setShowAddReplacement(false)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      setPlacementDate('')
      showToast('Replacement added successfully', 'success')
    } catch (error) {
      console.error('Error adding replacement:', error)
      showToast('Failed to add replacement', 'error')
    }
  }

  const updatePlacementStatus = async (placementId: string, status: string) => {
    try {
      const placement = placements.find(p => p.id === placementId)
      if (!placement) return

      const { error } = await supabase
        .from('placements')
        .update({
          status,
          updated_by: staff?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', placementId)

      if (error) throw error

      // Log status change
      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'status_change',
        entityType: 'client',
        entityId: placement.client_id,
        entityName: placement.candidate_name || '',
        oldValue: placement.status,
        newValue: status,
        description: `Placement status for ${placement.candidate_name} changed to ${status}${status === 'SUCCESS' ? ' - All followups auto-completed' : ''}`
      })

      await loadData()
      showToast(`Placement marked as ${status}${status === 'SUCCESS' ? ' - All followups completed automatically' : ''}`, 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }



  const getClientPlacements = (clientId: string) => {
    return placements.filter(p => p.client_id === clientId).sort((a, b) => a.replacement_number - b.replacement_number)
  }

  const handleDeletePlacement = async (placementId: string) => {
    const placement = placements.find(p => p.id === placementId)
    if (!placement) return
    
    if (!confirm(`Are you sure you want to delete the placement for ${placement.candidate_name}? This will also delete all related follow-ups.`)) {
      return
    }
    
    try {
      // Delete placement follow-ups first
      await supabase.from('placement_followups').delete().eq('placement_id', placementId)
      
      // Delete the placement
      const { error } = await supabase.from('placements').delete().eq('id', placementId)
      if (error) throw error
      
      await loadData()
      showToast('Placement deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting placement:', error)
      showToast('Failed to delete placement', 'error')
    }
  }





  const handleEditPlacement = async () => {
    if (!editingPlacement || !selectedCandidate) return

    try {
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name
      
      const { error } = await supabase
        .from('placements')
        .update({
          candidate_id: selectedCandidate,
          salary_amount: parseFloat(salaryAmount) || null,
          notes: placementNotes,
          updated_by: staff?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPlacement.id)

      if (error) throw error

      await ActivityLogger.log({
        userId: staff?.id || '',
        actionType: 'edit',
        entityType: 'client',
        entityId: editingPlacement.client_id,
        entityName: candidateName || '',
        description: `Updated placement: candidate changed from ${editingPlacement.candidate_name} to ${candidateName}, salary: $${salaryAmount || 'Not specified'}`
      })

      await loadData()
      setShowEditPlacement(false)
      setEditingPlacement(null)
      setSelectedCandidate('')
      setPlacementNotes('')
      setSalaryAmount('')
      showToast('Placement updated', 'success')
    } catch (error) {
      console.error('Error updating placement:', error)
      showToast('Failed to update placement', 'error')
    }
  }





  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm) ||
                         client.want_to_hire.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || client.placement_status === statusFilter
    return matchesSearch && matchesStatus
  })

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Converted Clients</h1>
        <p className="text-gray-600">Manage placements and follow-ups for won clients</p>
      </div>



      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
          >
            <option value="All">All Status</option>
            {placementStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 ${viewMode === 'card' ? 'bg-nestalk-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-nestalk-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredClients.map((client) => {
            const clientPlacements = getClientPlacements(client.id)
            
            const statusColors = {
              'Active': 'bg-emerald-100 text-emerald-800 border-emerald-200',
              'Lost (Refunded)': 'bg-rose-100 text-rose-800 border-rose-200',
              'Lost (No Refund)': 'bg-red-100 text-red-800 border-red-200'
            }
            
            return (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleViewDetails(client)}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-nestalk-primary transition-colors">{client.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{client.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                      statusColors[client.placement_status as keyof typeof statusColors] || statusColors['Active']
                    }`}>
                      {client.placement_status || 'Active'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{client.want_to_hire}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {clientPlacements.length === 0 ? 'No placements' : `${clientPlacements.length} placement${clientPlacements.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <button className="w-full text-center text-nestalk-primary hover:text-nestalk-primary/80 font-medium text-xs group-hover:bg-nestalk-primary/5 py-1 rounded transition-colors">
                    Manage Placement
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placements</th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const clientPlacements = getClientPlacements(client.id)
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.want_to_hire}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.placement_status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {client.placement_status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.placement_fee ? `$${client.placement_fee.toLocaleString()}` : 'Not set'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clientPlacements.length} placement{clientPlacements.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(client)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto relative">
            <button
              onClick={() => {
                setShowDetailModal(false)
                setSelectedClient(null)
                setShowAddPlacement(false)
                setShowAddReplacement(false)
                setSelectedCandidate('')
                setPlacementNotes('')
                setCandidateSearch('')
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              title="Close"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Placement Management - {selectedClient.name}
              </h2>

              {/* Placement Status & Add Button */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement Status</label>
                <div className="flex gap-4">
                  <select
                    value={placementStatus}
                    onChange={(e) => {
                      setPlacementStatus(e.target.value)
                      handleSavePlacement(undefined, e.target.value)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {placementStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  {getClientPlacements(selectedClient.id).length === 0 ? (
                    <button
                      onClick={() => setShowAddPlacement(true)}
                      className="flex-1 px-3 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                    >
                      Add Placement
                    </button>
                  ) : getClientPlacements(selectedClient.id).length < 3 && (
                    <button
                      onClick={() => setShowAddReplacement(true)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Replacement
                    </button>
                  )}
                </div>
              </div>

              {/* Placements Section */}
              <div className="mb-6">
                <div className="mb-4">
                  <h3 className="text-md font-semibold text-gray-900">Placements</h3>
                </div>

                <div className="space-y-4">
                  {getClientPlacements(selectedClient.id).map((placement, index) => (
                    <div key={placement.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          placement.status === 'SUCCESS' ? 'bg-green-500' : 
                          placement.status === 'LOST' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {placement.replacement_number === 0 ? 'O' : placement.replacement_number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {placement.candidate_name}
                          {placement.replacement_number > 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Replacement #{placement.replacement_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">Started: {formatDateTime(placement.placement_date + 'T00:00:00')}</div>
                        {placement.salary_amount && (
                          <div className="text-sm text-gray-500">Salary: ${placement.salary_amount.toLocaleString()}</div>
                        )}
                        {placement.notes && (
                          <div className="text-sm text-gray-600 mt-1">Notes: {placement.notes}</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingPlacement(placement)
                            setSelectedCandidate(placement.candidate_id)
                            setPlacementNotes(placement.notes || '')
                            setSalaryAmount(placement.salary_amount?.toString() || '')
                            setShowEditPlacement(true)
                          }}
                          className="p-2 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                          title="Edit Placement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlacement(placement.id)}
                          className="p-2 rounded bg-red-200 text-red-600 hover:bg-red-300"
                          title="Delete Placement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updatePlacementStatus(placement.id, 'SUCCESS')}
                          className={`p-2 rounded ${placement.status === 'SUCCESS' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Successful"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updatePlacementStatus(placement.id, 'LOST')}
                          className={`p-2 rounded ${placement.status === 'LOST' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          title="Mark as Lost"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Placement Form */}
                {showAddPlacement && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add Initial Placement</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement Date (leave blank for today)</label>
                        <input
                          type="date"
                          value={placementDate}
                          onChange={(e) => setPlacementDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search and select candidate..."
                            value={candidateSearch}
                            onChange={(e) => {
                              setCandidateSearch(e.target.value)
                              setSelectedCandidate('')
                              setShowDropdown(true)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                          {candidateSearch && showDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {candidates
                                .filter(candidate => candidate.name.toLowerCase().includes(candidateSearch.toLowerCase()))
                                .map(candidate => (
                                  <div
                                    key={candidate.id}
                                    onClick={() => {
                                      setSelectedCandidate(candidate.id)
                                      setCandidateSearch(candidate.name)
                                      setShowDropdown(false)
                                    }}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {candidate.name}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                        <input
                          type="number"
                          value={salaryAmount}
                          onChange={(e) => setSalaryAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement Fee</label>
                        <input
                          type="number"
                          value={placementFee}
                          onChange={(e) => setPlacementFee(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={placementNotes}
                          onChange={(e) => setPlacementNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          placeholder="Placement notes..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddPlacement}
                          disabled={!selectedCandidate}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Add Placement
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPlacement(false)
                            setSelectedCandidate('')
                            setPlacementNotes('')
                            setSalaryAmount('')
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Replacement Form */}
                {showAddReplacement && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add Replacement</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement Date (leave blank for today)</label>
                        <input
                          type="date"
                          value={placementDate}
                          onChange={(e) => setPlacementDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search and select candidate..."
                            value={candidateSearch}
                            onChange={(e) => {
                              setCandidateSearch(e.target.value)
                              setSelectedCandidate('')
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          />
                          {candidateSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {candidates
                                .filter(candidate => candidate.name.toLowerCase().includes(candidateSearch.toLowerCase()))
                                .map(candidate => (
                                  <div
                                    key={candidate.id}
                                    onClick={() => {
                                      setSelectedCandidate(candidate.id)
                                      setCandidateSearch(candidate.name)
                                    }}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {candidate.name}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                        <input
                          type="number"
                          value={salaryAmount}
                          onChange={(e) => setSalaryAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement Fee</label>
                        <input
                          type="number"
                          value={placementFee}
                          onChange={(e) => setPlacementFee(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Replacement</label>
                        <textarea
                          value={placementNotes}
                          onChange={(e) => setPlacementNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                          placeholder="Reason for replacement..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddReplacement}
                          disabled={!selectedCandidate}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Add Replacement
                        </button>
                        <button
                          onClick={() => {
                            setShowAddReplacement(false)
                            setSelectedCandidate('')
                            setPlacementNotes('')
                            setSalaryAmount('')
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>




            </div>
          </div>
        </div>
      )}



      {/* Edit Placement Modal */}
      {showEditPlacement && editingPlacement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Placement
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select New Candidate</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search and select candidate..."
                      value={selectedCandidate ? candidates.find(c => c.id === selectedCandidate)?.name || '' : candidateSearch}
                      onChange={(e) => {
                        setCandidateSearch(e.target.value)
                        setSelectedCandidate('')
                        setShowDropdown(true)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    />
                    {candidateSearch && showDropdown && !selectedCandidate && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {candidates
                          .filter(candidate => candidate.name.toLowerCase().includes(candidateSearch.toLowerCase()))
                          .map(candidate => (
                            <div
                              key={candidate.id}
                              onClick={() => {
                                setSelectedCandidate(candidate.id)
                                setCandidateSearch('')
                                setShowDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {candidate.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount</label>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={placementNotes}
                    onChange={(e) => setPlacementNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    placeholder="Update notes..."
                  />
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleEditPlacement}
                  disabled={!selectedCandidate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Update Placement
                </button>
                <button
                  onClick={() => {
                    setShowEditPlacement(false)
                    setEditingPlacement(null)
                    setSelectedCandidate('')
                    setPlacementNotes('')
                    setSalaryAmount('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Building2, Calendar, Clock, MessageCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalClients: 0,
    totalLeads: 0,
    activeClients: 0,
    wonClients: 0,
    lostClients: 0,
    pendingClients: 0,
    clientsThisMonth: 0,
    interviewWon: 0,
    winRate: 0,
    interviewConversion: 0,
    pendingPipeline: 0,
    qualificationRate: 0,
    activeCandidates: 0,
    wonCandidates: 0,
    lostCandidates: 0,
    candidatesThisMonth: 0,
    todayInterviews: 0,
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date().getFullYear() + '-01-01',
    endDate: new Date().getFullYear() + '-12-31'
  })
  const [showAllTime, setShowAllTime] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [placementFollowups, setPlacementFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time subscriptions
    const candidatesSubscription = supabase
      .channel('dashboard-candidates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const clientsSubscription = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const interviewsSubscription = supabase
      .channel('dashboard-interviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    const activitySubscription = supabase
      .channel('dashboard-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadDashboardData()
      })
      .subscribe()
    
    return () => {
      candidatesSubscription.unsubscribe()
      clientsSubscription.unsubscribe()
      interviewsSubscription.unsubscribe()
      activitySubscription.unsubscribe()
    }
  }, [dateRange, showAllTime])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let startDate, endDate
      
      if (showAllTime) {
        startDate = '1900-01-01T00:00:00'
        endDate = '2099-12-31T23:59:59'
      } else {
        startDate = dateRange.startDate + 'T00:00:00'
        endDate = dateRange.endDate + 'T23:59:59'
      }

      const thisMonth = new Date().toISOString().slice(0, 7) + '-01T00:00:00'
      
      // Load all clients data for calculations
      const { data: allClients } = await supabase.from('clients').select('*')
      const { data: allCandidates } = await supabase.from('candidates').select('*')
      
      // Client status definitions
      const clientStatuses = ['Active', 'Won', 'Lost - Disappointed With Profiles', 'Lost - Conflict of Interest', 'Lost - Competition']
      const lostClientStatuses = ['Lost - Disappointed With Profiles', 'Lost - Conflict of Interest', 'Lost - Competition']
      
      const totalClients = allClients?.filter(c => clientStatuses.includes(c.status)).length || 0
      const totalLeads = allClients?.length || 0
      const activeClients = allClients?.filter(c => c.status?.startsWith('Active')).length || 0
      const wonClients = allClients?.filter(c => c.status === 'Won').length || 0
      const lostClients = allClients?.filter(c => lostClientStatuses.includes(c.status)).length || 0
      const pendingClients = allClients?.filter(c => c.status?.startsWith('Pending')).length || 0
      const clientsThisMonth = allClients?.filter(c => new Date(c.created_at) >= new Date(thisMonth)).length || 0
      
      // Interview metrics
      const interviewWon = allCandidates?.filter(c => c.status === 'WON' && c.scheduled_date).length || 0
      const totalScheduled = allCandidates?.filter(c => c.scheduled_date).length || 0
      const winRate = totalClients > 0 ? Math.round((wonClients / totalClients) * 100) : 0
      const interviewConversion = totalScheduled > 0 ? Math.round((interviewWon / totalScheduled) * 100) : 0
      const pendingPipeline = allClients?.filter(c => ['Pending', 'Budget'].includes(c.status)).length || 0
      const qualificationRate = totalLeads > 0 ? Math.round((totalClients / totalLeads) * 100) : 0
      
      // Load remaining stats
      const [
        candidatesCount,
        activeCandidatesCount,
        wonCandidatesCount,
        lostCandidatesCount,
        candidatesThisMonthCount,
        todayInterviewsCount
      ] = await Promise.all([
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).in('status', ['Available', 'In Process', 'Interview Scheduled']),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('status', 'WON'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).like('status', 'Lost%'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).gte('created_at', thisMonth),
        supabase.from('interviews').select('id', { count: 'exact', head: true }).gte('date_time', today + 'T00:00:00').lt('date_time', today + 'T23:59:59')
      ])
      
      setStats({
        totalCandidates: candidatesCount.count || 0,
        totalClients,
        totalLeads,
        activeClients,
        wonClients,
        lostClients,
        pendingClients,
        clientsThisMonth,
        interviewWon,
        winRate,
        interviewConversion,
        pendingPipeline,
        qualificationRate,
        activeCandidates: activeCandidatesCount.count || 0,
        wonCandidates: wonCandidatesCount.count || 0,
        lostCandidates: lostCandidatesCount.count || 0,
        candidatesThisMonth: candidatesThisMonthCount.count || 0,
        todayInterviews: todayInterviewsCount.count || 0
      })

      // Load recent activity from activity_logs table
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select(`
          *,
          staff:user_id (name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load placement follow-ups that are due or overdue
      const { data: followups } = await supabase
        .from('placement_followups')
        .select(`
          *,
          placements(
            candidates(name),
            clients(name)
          )
        `)
        .is('completed_date', null)
        .lte('due_date', new Date().toISOString().split('T')[0])
        .limit(5)

      setRecentActivity(activityLogs || [])
      setPlacementFollowups(followups || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Date range change handler
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: value
    }))
  }

  const handleAllTimeToggle = () => {
    setShowAllTime(!showAllTime)
    if (!showAllTime) {
      // Reset to current year when switching to all time
      setDateRange({
        startDate: new Date().getFullYear() + '-01-01',
        endDate: new Date().getFullYear() + '-12-31'
      })
    }
  }

  const statCards = [
    // Client Cards (12)
    {
      name: 'Total Leads',
      value: stats.totalLeads,
      icon: Building2,
      color: 'bg-slate-500',
      href: '/clients',
    },
    {
      name: 'Total Clients',
      value: stats.totalClients,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/clients',
    },
    {
      name: 'Active Clients',
      value: stats.activeClients,
      icon: Building2,
      color: 'bg-green-500',
      href: '/clients',
    },
    {
      name: 'Won Clients',
      value: stats.wonClients,
      icon: Building2,
      color: 'bg-emerald-500',
      href: '/clients',
    },
    {
      name: 'Lost Clients',
      value: stats.lostClients,
      icon: Building2,
      color: 'bg-red-500',
      href: '/clients',
    },
    {
      name: 'Pending Clients',
      value: stats.pendingClients,
      icon: Building2,
      color: 'bg-yellow-500',
      href: '/clients',
    },
    {
      name: 'Interview Won',
      value: stats.interviewWon,
      icon: Building2,
      color: 'bg-teal-500',
      href: '/clients',
    },
    {
      name: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: Building2,
      color: 'bg-indigo-500',
      href: '/clients',
    },
    {
      name: 'Interview Conversion',
      value: `${stats.interviewConversion}%`,
      icon: Building2,
      color: 'bg-cyan-500',
      href: '/clients',
    },
    {
      name: 'Pending Pipeline',
      value: stats.pendingPipeline,
      icon: Building2,
      color: 'bg-amber-500',
      href: '/clients',
    },
    {
      name: 'Qualification Rate',
      value: `${stats.qualificationRate}%`,
      icon: Building2,
      color: 'bg-rose-500',
      href: '/clients',
    },
    {
      name: 'Clients This Month',
      value: stats.clientsThisMonth,
      icon: Building2,
      color: 'bg-purple-500',
      href: '/clients',
    },
    // Candidate Cards (5)
    {
      name: 'Total Candidates',
      value: stats.totalCandidates,
      icon: Users,
      color: 'bg-blue-500',
      href: '/candidates',
    },
    {
      name: 'Active Candidates',
      value: stats.activeCandidates,
      icon: Users,
      color: 'bg-green-500',
      href: '/candidates',
    },
    {
      name: 'Won Candidates',
      value: stats.wonCandidates,
      icon: Users,
      color: 'bg-emerald-500',
      href: '/candidates',
    },
    {
      name: 'Lost Candidates',
      value: stats.lostCandidates,
      icon: Users,
      color: 'bg-red-500',
      href: '/candidates',
    },
    {
      name: 'Candidates This Month',
      value: stats.candidatesThisMonth,
      icon: Users,
      color: 'bg-purple-500',
      href: '/candidates',
    },
    {
      name: "Today's Interviews",
      value: stats.todayInterviews,
      icon: Calendar,
      color: 'bg-orange-500',
      href: '/interviews',
    },
  ]

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your team activity overview.</p>
      </div>

      {/* Stats Cards */}
      {/* Date Range Selector */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAllTime}
              onChange={handleAllTimeToggle}
              className="rounded border-gray-300 text-nestalk-primary focus:ring-nestalk-primary"
            />
            <span className="text-sm text-gray-700 font-medium">All Time</span>
          </label>
        </div>
        
        {!showAllTime && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-0 flex-shrink-0">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-0 flex-shrink-0">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
              />
            </div>
          </>
        )}
        
        {showAllTime && (
          <span className="text-sm text-gray-500 italic">Showing data for all time periods</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <button
            key={card.name}
            onClick={() => navigate(card.href)}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left w-full"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placement Follow-ups */}
        {placementFollowups.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 text-red-400" />
                <h2 className="ml-2 text-lg font-semibold text-gray-900">Placement Follow-ups Due</h2>
                <button
                  onClick={() => navigate('/placements')}
                  className="ml-auto text-sm text-nestalk-primary hover:text-nestalk-primary/80"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {placementFollowups.map((followup) => {
                  const isOverdue = new Date(followup.due_date) < new Date()
                  const candidateName = followup.placements?.candidates?.name || 'Unknown'
                  const clientName = followup.placements?.clients?.name || 'Unknown'
                  
                  return (
                    <div key={followup.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                      isOverdue ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          isOverdue ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {clientName} - {candidateName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {followup.followup_type === '2_week' ? '2-week' : 'Monthly'} check - {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(followup.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="ml-2 text-lg font-semibold text-gray-900">Recent Activity</h2>
              {recentActivity.length > 0 && (
                <button
                  onClick={() => navigate('/updates')}
                  className="ml-auto text-sm text-nestalk-primary hover:text-nestalk-primary/80"
                >
                  View All
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.action_type === 'status_change' ? 'bg-blue-500' :
                        activity.action_type === 'edit' ? 'bg-yellow-500' :
                        activity.action_type === 'create' ? 'bg-green-500' :
                        activity.action_type === 'reschedule' ? 'bg-purple-500' :
                        activity.action_type === 'bulk_upload' ? 'bg-indigo-500' :
                        'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SearchFilter } from '../../components/ui/SearchFilter'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { CommunicationsModal } from '../../components/ui/CommunicationsModal'
import { Plus, Building2, Calendar, User, MessageSquare, Eye, Edit, AlertTriangle, ChevronDown, Clock, X, Pencil, Upload } from 'lucide-react'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ActivityLogger } from '../../lib/activityLogger'
import { formatDateTime } from '../../utils/dateFormat'
import { StatusHistoryLogger } from '../../lib/statusHistory'

interface Client {
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

export function Leads() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCommsModal, setShowCommsModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedClientForReminder, setSelectedClientForReminder] = useState<Client | null>(null)
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedClientForNotes, setSelectedClientForNotes] = useState<Client | null>(null)
  const [clientNotes, setClientNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gmail: '',
    source: '',
    want_to_hire: '',
    status: 'Pending - No communication',
    inquiry_date: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  // All status options for leads and clients
  const allStatusOptions = [
    // Lead statuses
    'Pending - No communication',
    'Pending - Form not filled',
    'Pending - PAF not paid',
    'Pending - Lead Status: Lost',
    'Lost - Budget',
    'Lost - Competition',
    'Lost - Ghosted',
    // Client and Lead statuses
    'Active - Reviewing Profiles',
    'Active - Conducting Trials',
    'Active - Payment Pending',
    'Active - But Dormant',
    'Won',
    'Lost - Disappointed With Profiles',
    'Lost - Conflict of Interest',
    'Lost - Ghosted',
    'Lost - Competition'
  ]
  
  // Source options (same as candidates table)
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']
  
  // Role options (updated as requested)  
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper', 'Uniforms']

  // Load unread notes counts
  const loadUnreadCounts = async () => {
    if (!staff?.name) return
    
    const counts: Record<string, number> = {}
    const totalCounts: Record<string, number> = {}
    
    for (const client of clients) {
      // Get unread count
      const { data: unreadData } = await supabase.rpc('get_unread_notes_count', {
        entity_type: 'client',
        entity_id: client.id,
        user_name: staff.name
      })
      counts[client.id] = unreadData || 0
      
      // Get total note count
      const { data: totalData } = await supabase
        .from('client_notes')
        .select('id', { count: 'exact' })
        .eq('client_id', client.id)
      
      totalCounts[client.id] = totalData?.length || 0
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

  // Helper function to check if client needs attention - ONLY for reminders
  const needsAttention = (client: Client): boolean => {
    if (client.custom_reminder_datetime) {
      const now = new Date()
      const reminderTime = new Date(client.custom_reminder_datetime)
      if (now >= reminderTime) return true
    }
    return false
  }

  // Bulk upload functionality
  const downloadTemplate = () => {
    const csvContent = `Name,Phone,Gmail,Source,Want to Hire,Status,Inquiry Date (YYYY-MM-DD)
John Doe,0712345678,john@example.com,Referral,Nanny,Active - Reviewing Profiles,2025-01-10
Jane Smith,0723456789,jane@example.com,TikTok,Chef,Pending - No communication,2025-01-12`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client_upload_template.csv'
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
        .in('status', ['Active', 'Reviewing Profiles', 'Profile Sent but no response', 'Conducting Trials', 'Payment Pending', 'Won', 'Lost', 'Active - Form filled, no response yet', 'Active - Communication ongoing', 'Active - Payment pending'])
      if (fetchError) {
        console.error('Error fetching existing clients:', fetchError)
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

          if (!allStatusOptions.includes(status)) {
            errors.push(`Row ${i + 2}: Invalid status '${status}'. Must be one of: ${allStatusOptions.join(', ')}`)
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
          'client',
          inserts.length,
          staff.name
        )
      }

      await loadClients()
      setShowBulkUpload(false)
      setUploadFile(null)
      showToast(`Successfully uploaded ${inserts.length} clients`, 'success')
    } catch (error) {
      console.error('Error bulk uploading clients:', error)
      showToast(`Error uploading clients: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadClients()
    
    const subscription = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        loadClients()
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
    if (clients.length > 0) {
      loadUnreadCounts()
    }
  }, [clients, staff?.name])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm, filterStatus])

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
      showToast('Failed to load clients', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterClients = () => {
    let filtered = clients

    if (searchTerm) {
      // Normalize phone number for search
      const normalizePhone = (phone: string) => {
        return phone.replace(/[^0-9]/g, '') // Remove all non-digits
      }
      
      const searchPhone = normalizePhone(searchTerm)
      
      filtered = filtered.filter(client => {
        const nameMatch = client.name.toLowerCase().includes(searchTerm.toLowerCase())
        const gmailMatch = client.gmail.toLowerCase().includes(searchTerm.toLowerCase())
        const sourceMatch = client.source?.toLowerCase().includes(searchTerm.toLowerCase())
        const roleMatch = client.want_to_hire.toLowerCase().includes(searchTerm.toLowerCase())
        
        // Phone matching with normalization
        let phoneMatch = false
        if (searchPhone) {
          const clientPhone = normalizePhone(client.phone)
          phoneMatch = clientPhone.includes(searchPhone) ||
                      clientPhone.endsWith(searchPhone) ||
                      (searchPhone.startsWith('0') && clientPhone.endsWith(searchPhone.substring(1)))
        }
        
        return nameMatch || phoneMatch || gmailMatch || sourceMatch || roleMatch
      })
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => {
        if (filterStatus === 'Pending') {
          return client.status.startsWith('Pending -')
        }
        if (filterStatus === 'Active') {
          return client.status.startsWith('Active -')
        }
        if (filterStatus === 'Lost/Cold') {
          return client.status.startsWith('Lost/Cold -')
        }
        return client.status === filterStatus
      })
    }

    setFilteredClients(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedClient) {
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
          .eq('id', selectedClient.id)

        if (error) throw error

        if (staff?.id && staff?.name) {
          const oldStatus = selectedClient.status
          const newStatus = formData.status
          
          if (oldStatus !== newStatus) {
            // Log status change to history
            await StatusHistoryLogger.logStatusChange(
              'client',
              selectedClient.id,
              formData.name,
              oldStatus,
              newStatus,
              staff.id,
              staff.name
            )
          }
          
          await ActivityLogger.logEdit(
            staff.id,
            'client',
            selectedClient.id,
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
          // Log initial status to history
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

      await loadClients()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving client:', error)
      showToast('Failed to save client', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      gmail: '',
      source: '',
      want_to_hire: '',
      status: 'Pending - No communication',
      inquiry_date: ''
    })
    setSelectedClient(null)
  }

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      phone: client.phone,
      gmail: client.gmail,
      source: client.source || 'Referral',
      want_to_hire: client.want_to_hire,
      status: client.status,
    })
    setShowModal(true)
  }

  const handleReminderEdit = (client: Client) => {
    setSelectedClientForReminder(client)
    if (client.custom_reminder_datetime) {
      const reminderDate = new Date(client.custom_reminder_datetime)
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
    if (!selectedClientForReminder) return
    
    try {
      let custom_reminder_datetime = null
      if (reminderForm.date && reminderForm.time) {
        custom_reminder_datetime = `${reminderForm.date}T${reminderForm.time}:00`
      }

      const { error } = await supabase
        .from('clients')
        .update({ custom_reminder_datetime })
        .eq('id', selectedClientForReminder.id)

      if (error) throw error

      await loadClients()
      setShowReminderModal(false)
      setSelectedClientForReminder(null)
      setReminderForm({ date: '', time: '' })
      showToast('Reminder updated successfully', 'success')
    } catch (error) {
      console.error('Error updating reminder:', error)
      showToast('Failed to update reminder', 'error')
    }
  }

  const handleReminderDelete = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ custom_reminder_datetime: null })
        .eq('id', clientId)

      if (error) throw error

      await loadClients()
      showToast('Reminder cancelled successfully', 'success')
    } catch (error) {
      console.error('Error cancelling reminder:', error)
      showToast('Failed to cancel reminder', 'error')
    }
  }

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedClients.length === 0) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: bulkStatus })
        .in('id', selectedClients)
      
      if (error) throw error
      
      await loadClients()
      setSelectedClients([])
      setBulkStatus('')
      showToast(`Updated ${selectedClients.length} clients to ${bulkStatus}`, 'success')
    } catch (error) {
      console.error('Error updating bulk status:', error)
      showToast('Failed to update clients', 'error')
    }
  }

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(c => c.id))
    }
  }

  const handleViewNotes = async (client: Client) => {
    setSelectedClientForNotes(client)
    setShowNotesModal(true)
    setClientNotes([]) // Clear previous notes
    
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading notes:', error)
        return
      }
      
      console.log('Loaded client notes:', data) // Debug log
      setClientNotes(data || [])
      
      // Mark all notes as read for current user
      if (staff?.name && data?.length > 0) {
        for (const note of data) {
          const currentReadBy = note.read_by || {}
          const updatedReadBy = { ...currentReadBy, [staff.name]: new Date().toISOString() }
          
          await supabase
            .from('client_notes')
            .update({ read_by: updatedReadBy })
            .eq('id', note.id)
        }
        
        // Update unread count immediately
        setUnreadCounts(prev => ({ ...prev, [client.id]: 0 }))
      }
    } catch (error) {
      console.error('Error in handleViewNotes:', error)
      setClientNotes([])
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedClientForNotes) return
    
    try {
      const { error } = await supabase
        .from('client_notes')
        .insert({
          client_id: selectedClientForNotes.id,
          note: newNote.trim(),
          created_by: staff?.name || user?.email || 'Unknown'
        })
      
      if (error) throw error
      
      setNewNote('')
      await handleViewNotes(selectedClientForNotes)
      await loadUnreadCounts() // Refresh both counts
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
          <h1 className="text-2xl font-bold text-gray-900">Leads2 (All Records)</h1>
          <p className="text-gray-600">Manage all lead inquiries and client records</p>
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
            Add Lead
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={allStatusOptions}
        placeholder="Search by name, phone, gmail, source, or role..."
      />

      {/* Bulk Actions */}
      {selectedClients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedClients.length} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm"
            >
              <option value="">Change status to...</option>
              {allStatusOptions.map(status => (
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
              onClick={() => setSelectedClients([])}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
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
              {filteredClients.map((client, index) => {
                const hasAttention = needsAttention(client)
                return (
                  <tr key={client.id} className={`hover:bg-gray-50 ${hasAttention ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients(prev => [...prev, client.id])
                          } else {
                            setSelectedClients(prev => prev.filter(id => id !== client.id))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {hasAttention && <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />}
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.source || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.want_to_hire}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={client.status} type="client" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {client.custom_reminder_datetime ? (
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 min-w-0 flex-1">
                            <div className="text-xs">
                              {(() => {
                                const timeInfo = getTimeUntilReminder(client.custom_reminder_datetime)
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
                            onClick={() => handleReminderEdit(client)}
                            className="text-blue-600 hover:text-blue-800 p-1 border border-blue-300 rounded hover:bg-blue-50"
                            title="Set/Edit Reminder"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {client.custom_reminder_datetime && (
                            <button
                              onClick={() => handleReminderDelete(client.id)}
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
                          onClick={() => handleViewNotes(client)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                          title="View/Add Notes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Red badge for unread notes */}
                        {(unreadCounts[client.id] || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {unreadCounts[client.id]}
                          </span>
                        )}
                        {/* Gray badge for read notes (when there are notes but all are read) */}
                        {(noteCounts[client.id] || 0) > 0 && (unreadCounts[client.id] || 0) === 0 && (
                          <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {noteCounts[client.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(client.inquiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-nestalk-primary hover:text-nestalk-primary/80"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <select
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            if (newStatus) {
                              try {
                                const oldStatus = client.status
                                const { error } = await supabase
                                  .from('clients')
                                  .update({ status: newStatus })
                                  .eq('id', client.id)
                                if (error) throw error
                                
                                setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c))
                                
                                // Log status change
                                if (user?.id && staff?.name) {
                                  await supabase.from('activity_logs').insert({
                                    user_id: user.id,
                                    action_type: 'status_change',
                                    entity_type: 'client',
                                    entity_id: client.id,
                                    entity_name: client.name,
                                    old_value: oldStatus,
                                    new_value: newStatus,
                                    description: `${staff.name} changed ${client.name} status from ${oldStatus} to ${newStatus}`
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
                          {allStatusOptions.map(status => (
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

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first client inquiry.'
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
                {selectedClient ? 'Edit Lead' : 'Add New Lead'}
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
                    {allStatusOptions.map(status => (
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
                    {selectedClient ? 'Update' : 'Add'} Lead
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
                    <li>Status (optional, defaults to Active)</li>
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
              {selectedClientForReminder?.custom_reminder_datetime ? 'Edit Reminder' : 'Set Reminder'}
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
                  setSelectedClientForReminder(null)
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
                Notes for {selectedClientForNotes?.name} ({noteCounts[selectedClientForNotes?.id || ''] || 0} notes)
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
                      setSelectedClientForNotes(null)
                      setClientNotes([])
                      setNewNote('')
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {clientNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  clientNotes.map((note) => (
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

export default Leads
import React from 'react'
import { Target } from 'lucide-react'

export function LeadTracker() {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Lead Tracker</h3>
        <p className="mt-1 text-sm text-gray-500">Coming Soon</p>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, ChevronUp, CheckCircle, Eye } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../utils/dateFormat'

interface PlacementData {
  id: string
  candidate_name: string
  client_name: string
  placement_date: string
  followup_reminders: FollowupReminder[]
  salary_reminders: SalaryReminder[]
}

interface FollowupReminder {
  id: string
  due_date: string
  completed_date: string | null
  satisfaction_rating: number | null
  issues: string | null
  completed_by: string | null
  staff_name?: string
}

interface SalaryReminder {
  id: string
  due_date: string
  completed_date: string | null
  salary_paid: boolean | null
  completed_by: string | null
  staff_name?: string
}

export function Placements() {
  const [placements, setPlacements] = useState<PlacementData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(new Set())
  const [completingFollowup, setCompletingFollowup] = useState<string | null>(null)
  const [completingSalary, setCompletingSalary] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [salaryPaid, setSalaryPaid] = useState(true)
  const [viewingNotes, setViewingNotes] = useState<{id: string, notes: string, type: string} | null>(null)
  const [followupSearch, setFollowupSearch] = useState('')
  const [salarySearch, setSalarySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editingPlacement, setEditingPlacement] = useState<{id: string, date: string, status: string} | null>(null)

  const { showToast } = useToast()
  const { staff } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: placementsData, error } = await supabase
        .from('placements')
        .select(`
          id,
          placement_date,
          status,
          candidates(name),
          clients(name)
        `)
        .in('status', ['ACTIVE', 'SUCCESS', 'LOST'])
        .order('placement_date', { ascending: false })

      if (error) throw error

      const { data: followupsData, error: followupsError } = await supabase
        .from('placement_followups')
        .select(`
          id,
          placement_id,
          followup_type,
          due_date,
          completed_date,
          satisfaction_rating,
          issues,
          salary_paid,
          updated_by,
          completed_by_username,
          staff!updated_by(username)
        `)
        .in('placement_id', placementsData?.map(p => p.id) || [])
      
      console.log('Placements data:', placementsData)
      console.log('Followups data:', followupsData)

      const formattedPlacements = (placementsData || []).map(p => {
        const placementFollowups = followupsData?.filter(f => f.placement_id === p.id) || []
        
        return {
          id: p.id,
          candidate_name: p.candidates?.name || 'Unknown',
          client_name: p.clients?.name || 'Unknown',
          placement_date: p.placement_date,
          status: p.status,
          followup_reminders: placementFollowups
            .filter(f => f.followup_type === '2_week')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map(f => ({
              id: f.id,
              due_date: f.due_date,
              completed_date: f.completed_date,
              satisfaction_rating: f.satisfaction_rating,
              issues: f.issues,
              completed_by: f.updated_by,
              staff_name: f.completed_by_username || f.staff?.username || 'FB'
            })),
          salary_reminders: placementFollowups
            .filter(f => f.followup_type === 'salary')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map(f => ({
              id: f.id,
              due_date: f.due_date,
              completed_date: f.completed_date,
              salary_paid: f.salary_paid,
              completed_by: f.updated_by,
              staff_name: f.completed_by_username || f.staff?.username || 'FB'
            }))
        }
      })

      setPlacements(formattedPlacements)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (placementId: string) => {
    const newExpanded = new Set(expandedPlacements)
    if (newExpanded.has(placementId)) {
      newExpanded.delete(placementId)
    } else {
      newExpanded.add(placementId)
    }
    setExpandedPlacements(newExpanded)
  }

  const completeFollowup = async (followupId: string, placementId: string) => {
    if (!notes.trim()) {
      showToast('Notes are required', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('placement_followups')
        .update({
          completed_date: new Date().toISOString(),
          satisfaction_rating: rating,
          issues: notes,
          updated_by: staff?.id,
          completed_by_username: staff?.username
        })
        .eq('id', followupId)

      if (error) throw error

      await loadData()
      setCompletingFollowup(null)
      setNotes('')
      setRating(5)
      showToast('Follow-up completed', 'success')
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to complete follow-up', 'error')
    }
  }

  const completeSalary = async (salaryId: string, placementId: string) => {
    try {
      const { error } = await supabase
        .from('placement_followups')
        .update({
          completed_date: new Date().toISOString(),
          salary_paid: salaryPaid,
          updated_by: staff?.id,
          completed_by_username: staff?.username
        })
        .eq('id', salaryId)

      if (error) throw error

      await loadData()
      setCompletingSalary(null)
      setSalaryPaid(true)
      showToast('Salary reminder completed', 'success')
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to complete salary reminder', 'error')
    }
  }

  const getCompletedCount = (reminders: any[]) => {
    return reminders.filter(r => r.completed_date).length
  }

  const getDueDateBadge = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays)
      return (
        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
          {overdueDays}d overdue
        </span>
      )
    } else if (diffDays === 0) {
      return (
        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
          Due today
        </span>
      )
    } else if (diffDays <= 7) {
      return (
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
          {diffDays}d remaining
        </span>
      )
    } else if (diffDays <= 30) {
      return (
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
          {diffDays}d remaining
        </span>
      )
    } else {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      return (
        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
          {months}m {days}d remaining
        </span>
      )
    }
  }

  const filteredFollowupPlacements = placements.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(followupSearch.toLowerCase()) ||
                         p.candidate_name.toLowerCase().includes(followupSearch.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredSalaryPlacements = placements.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(salarySearch.toLowerCase()) ||
                         p.candidate_name.toLowerCase().includes(salarySearch.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const updatePlacementStatus = async (placementId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('placements')
        .update({ status: newStatus, updated_by: staff?.id })
        .eq('id', placementId)
      
      if (error) throw error
      await loadData()
      showToast(`Placement marked as ${newStatus}`, 'success')
    } catch (error) {
      console.error('Error updating placement status:', error)
      showToast('Failed to update placement status', 'error')
    }
  }

  const getSuccessRate = (reminders: any[]) => {
    const completed = reminders.filter(r => r.completed_date && r.satisfaction_rating)
    if (completed.length === 0) return 0
    const avgRating = completed.reduce((sum, r) => sum + r.satisfaction_rating, 0) / completed.length
    return Math.round((avgRating / 5) * 100)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow h-20"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
        <p className="text-gray-600">Manage follow-up and salary reminders</p>
      </div>

      {/* Follow-up Reminders Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up Reminders</h2>
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUCCESS">Success</option>
                <option value="LOST">Lost</option>
              </select>
              <input
                type="text"
                placeholder="Search placements..."
                value={followupSearch}
                onChange={(e) => setFollowupSearch(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-64"
              />
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredFollowupPlacements.map((placement, placementIndex) => {
            const isExpanded = expandedPlacements.has(placement.id)
            const completedCount = getCompletedCount(placement.followup_reminders)
            
            return (
              <div key={placement.id} className="p-4">
                <div 
                  className="relative cursor-pointer hover:bg-gray-50 p-4 rounded min-h-[80px]"
                  onClick={() => toggleExpanded(placement.id)}
                >
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-bold ${
                    placement.status === 'ACTIVE' ? 'bg-green-600 text-white' :
                    placement.status === 'SUCCESS' ? 'bg-blue-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {placement.status}
                  </span>
                  <div className="flex items-center space-x-4 pr-20">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{placementIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {placement.client_name} - {placement.candidate_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Started: {formatDateTime(placement.placement_date + 'T00:00:00')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {completedCount}/6
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {getSuccessRate(placement.followup_reminders)}% success
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3 pl-4">
                    {placement.followup_reminders.length === 0 ? (
                      <div className="p-3 bg-yellow-50 rounded text-sm text-yellow-700">
                        No follow-up reminders found. Check if placement_followups were created properly.
                      </div>
                    ) : (
                      placement.followup_reminders.map((reminder, index) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            {reminder.completed_date ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Check #{index + 1}</p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  Due: {formatDateTime(reminder.due_date + 'T00:00:00')}
                                </p>
                                {!reminder.completed_date && getDueDateBadge(reminder.due_date)}
                              </div>
                              {reminder.completed_date && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <p>Completed: {formatDateTime(reminder.completed_date)}</p>
                                  <p>By: {reminder.staff_name || 'FB'}</p>
                                  <p>Rating: {reminder.satisfaction_rating}/5</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {reminder.completed_date && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (reminder.issues) {
                                    setViewingNotes({id: reminder.id, notes: reminder.issues, type: 'Follow-up'})
                                  }
                                }}
                                className={reminder.issues ? 'text-blue-600 hover:text-blue-800' : 'text-gray-300 cursor-not-allowed'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {!reminder.completed_date && (
                              <div onClick={(e) => e.stopPropagation()}>
                                {completingFollowup === reminder.id ? (
                                  <div className="space-y-2">
                                    <select
                                      value={rating}
                                      onChange={(e) => setRating(parseInt(e.target.value))}
                                      className="text-xs px-2 py-1 border rounded"
                                    >
                                      <option value={5}>5 - Excellent</option>
                                      <option value={4}>4 - Good</option>
                                      <option value={3}>3 - Average</option>
                                      <option value={2}>2 - Poor</option>
                                      <option value={1}>1 - Very Poor</option>
                                    </select>
                                    <textarea
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      placeholder="Notes (required)"
                                      className="text-xs px-2 py-1 border rounded w-full"
                                      rows={2}
                                    />
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => completeFollowup(reminder.id, placement.id)}
                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        Complete
                                      </button>
                                      <button
                                        onClick={() => setCompletingFollowup(null)}
                                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCompletingFollowup(reminder.id)}
                                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Salary Reminders Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Salary Reminders</h2>
            <input
              type="text"
              placeholder="Search placements..."
              value={salarySearch}
              onChange={(e) => setSalarySearch(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredSalaryPlacements.map((placement, placementIndex) => {
            const isExpanded = expandedPlacements.has(`salary-${placement.id}`)
            const completedCount = getCompletedCount(placement.salary_reminders)
            
            return (
              <div key={`salary-${placement.id}`} className="p-4">
                <div 
                  className="relative cursor-pointer hover:bg-gray-50 p-4 rounded min-h-[80px]"
                  onClick={() => toggleExpanded(`salary-${placement.id}`)}
                >
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-bold ${
                    placement.status === 'ACTIVE' ? 'bg-green-600 text-white' :
                    placement.status === 'SUCCESS' ? 'bg-blue-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {placement.status}
                  </span>
                  <div className="flex items-center space-x-4 pr-20">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{placementIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {placement.client_name} - {placement.candidate_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Started: {formatDateTime(placement.placement_date + 'T00:00:00')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {completedCount}/3
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3 pl-4">
                    {placement.salary_reminders.length === 0 ? (
                      <div className="p-3 bg-yellow-50 rounded text-sm text-yellow-700">
                        No salary reminders found. Check if placement_followups were created properly.
                      </div>
                    ) : (
                      placement.salary_reminders.map((reminder, index) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            {reminder.completed_date ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Month {index + 1}</p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  Due: {formatDateTime(reminder.due_date + 'T00:00:00')}
                                </p>
                                {!reminder.completed_date && getDueDateBadge(reminder.due_date)}
                              </div>
                              {reminder.completed_date && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <p>Completed: {formatDateTime(reminder.completed_date)}</p>
                                  <p>By: {reminder.staff_name || 'FB'}</p>
                                  <p>Salary Paid: {reminder.salary_paid ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {!reminder.completed_date && (
                            <div onClick={(e) => e.stopPropagation()}>
                              {completingSalary === reminder.id ? (
                                <div className="space-y-2">
                                  <div className="flex space-x-2">
                                    <label className="flex items-center text-xs">
                                      <input
                                        type="radio"
                                        checked={salaryPaid === true}
                                        onChange={() => setSalaryPaid(true)}
                                        className="mr-1"
                                      />
                                      Paid
                                    </label>
                                    <label className="flex items-center text-xs">
                                      <input
                                        type="radio"
                                        checked={salaryPaid === false}
                                        onChange={() => setSalaryPaid(false)}
                                        className="mr-1"
                                      />
                                      Not Paid
                                    </label>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => completeSalary(reminder.id, placement.id)}
                                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={() => setCompletingSalary(null)}
                                      className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCompletingSalary(reminder.id)}
                                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Notes Viewing Modal */}
      {viewingNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {viewingNotes.type} Notes
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingNotes.notes}</p>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setViewingNotes(null)}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SearchFilter } from '../../components/ui/SearchFilter'
import { Eye, Users } from 'lucide-react'
import { formatDate } from '../../utils/dateFormat'

interface StaffMember {
  id: string
  name: string
  phone: string
  role: string
  source: string
  inquiry_date: string
  notes?: string
  created_at: string
}

export function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [])

  useEffect(() => {
    filterStaff()
  }, [staff, searchTerm])

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('status', 'WON')
        .order('inquiry_date', { ascending: false })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStaff = () => {
    let filtered = [...staff]

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.source.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredStaff(filtered)
  }

  const handleViewDetails = (member: StaffMember) => {
    setSelectedStaff(member)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-20"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Members</h1>
        <p className="text-gray-600">Successfully hired candidates</p>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus="all"
        onFilterChange={() => {}}
        statusOptions={[]}
        placeholder="Search by name, phone, role, or source..."
        hideStatusFilter
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hired Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((member, index) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(member.inquiry_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(member)}
                      className="text-nestalk-primary hover:text-nestalk-primary/80"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No candidates have been hired yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Member Details</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStaff.source}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hired Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStaff.inquiry_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Added to System</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStaff.created_at)}</p>
                  </div>
                </div>
                
                {selectedStaff.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedStaff.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
import React from 'react'
import { GraduationCap } from 'lucide-react'

export function TrainingLeads() {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Training Leads</h3>
        <p className="mt-1 text-sm text-gray-500">Coming Soon</p>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Shield, Search, ChevronDown, Save, FileText, Download, AlertTriangle, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

interface Candidate {
  id: string
  name: string
  phone: string
  role: string
  status: string
  years_experience?: number
  certifications?: string[]
  languages?: string[]
  ages_experienced?: string[]
}

interface CandidateWithAssessment extends Candidate {
  assessment_status?: string
  assessment_id?: string
  overall_percentage?: number
}

interface Pillar {
  id: string
  name: string
  pillar_weight: number
  display_order: number
}

interface Criterion {
  id: string
  pillar_id: string
  name: string
  why_it_matters: string
  how_to_assess: string
  interviewer_question: string
  criterion_weight: number
  is_critical: boolean
  guidance_1: string
  guidance_2: string
  guidance_3: string
  guidance_4: string
  guidance_5: string
  red_flag_hints: string
  display_order: number
}

interface Response {
  criterion_id: string
  score: number | null
  notes: string
  red_flags: string
}

interface Assessment {
  id?: string
  candidate_id: string
  interview_date: string
  status: 'draft' | 'completed' | 'locked'
  overall_percentage?: number
  aggregate_score?: number
  onboard_recommendation?: boolean
  onboard_reason?: string
  key_strength?: string
  next_strength?: string
  development_needed?: string
  narrative?: string
}

export function Vetting() {
  const [candidates, setCandidates] = useState<CandidateWithAssessment[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithAssessment[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [selectedPillar, setSelectedPillar] = useState<string>('')
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [showCandidateSelection, setShowCandidateSelection] = useState(true)
  const [showVetModal, setShowVetModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [candidateDetails, setCandidateDetails] = useState({
    years_experience: 0,
    certifications: [] as string[],
    languages: [] as string[],
    ages_experienced: [] as string[]
  })

  const { user } = useAuth()
  const { showToast } = useToast()

  const ageOptions = ['Infant', 'Toddler', 'Preschooler', 'School Age', 'Teen']
  const statusOptions = ['PENDING', 'INTERVIEW_SCHEDULED', 'VETTED', 'ONBOARDED']

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, statusFilter])

  useEffect(() => {
    if (selectedCandidate) {
      loadOrCreateAssessment()
      setShowCandidateSelection(false)
    }
  }, [selectedCandidate])

  useEffect(() => {
    if (pillars.length > 0 && !selectedPillar) {
      setSelectedPillar(pillars[0].id)
    }
  }, [pillars])

  useEffect(() => {
    setCurrentCriterionIndex(0)
  }, [selectedPillar])

  const loadInitialData = async () => {
    try {
      const [candidatesRes, pillarsRes, criteriaRes] = await Promise.all([
        supabase.from('candidates').select(`
          *,
          assessments(
            id,
            status,
            overall_percentage
          )
        `).in('status', ['PENDING', 'INTERVIEW_SCHEDULED']),
        supabase.from('pillars').select('*').order('display_order'),
        supabase.from('criteria').select('*').order('display_order')
      ])

      const candidatesWithAssessments = (candidatesRes.data || []).map(candidate => {
        const assessment = candidate.assessments?.[0]
        let status = 'none'
        
        if (assessment) {
          status = assessment.status === 'completed' ? 'completed' : 'draft'
        }
        
        return {
          ...candidate,
          assessment_status: status,
          assessment_id: assessment?.id,
          overall_percentage: assessment?.overall_percentage
        }
      })
      
      setCandidates(candidatesWithAssessments)
      setPillars(pillarsRes.data || [])
      setCriteria(criteriaRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterCandidates = () => {
    let filtered = candidates.filter(candidate => 
      candidate.assessment_status === 'draft' || candidate.assessment_status === 'completed'
    )

    if (searchTerm) {
      filtered = filtered.filter(candidate => 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => {
        if (statusFilter === 'draft') {
          return candidate.assessment_status === 'draft'
        }
        if (statusFilter === 'completed') {
          return candidate.assessment_status === 'completed'
        }
        return true
      })
    }

    setFilteredCandidates(filtered)
  }

  const loadOrCreateAssessment = async () => {
    if (!selectedCandidate) return

    try {
      const { data: existingAssessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('candidate_id', selectedCandidate.id)
        .eq('status', 'draft')
        .single()

      if (existingAssessment) {
        setAssessment(existingAssessment)
        loadResponses(existingAssessment.id)
      } else {
        const newAssessment: Assessment = {
          candidate_id: selectedCandidate.id,
          interview_date: new Date().toISOString().split('T')[0],
          status: 'draft'
        }
        setAssessment(newAssessment)
        setResponses({})
      }

      setCandidateDetails({
        years_experience: selectedCandidate.years_experience || 0,
        certifications: selectedCandidate.certifications || [],
        languages: selectedCandidate.languages || [],
        ages_experienced: selectedCandidate.ages_experienced || []
      })
    } catch (error) {
      console.error('Error loading assessment:', error)
    }
  }

  const loadResponses = async (assessmentId: string) => {
    try {
      const { data } = await supabase
        .from('responses')
        .select('*')
        .eq('assessment_id', assessmentId)

      const responsesMap: Record<string, Response> = {}
      data?.forEach(r => {
        responsesMap[r.criterion_id] = {
          criterion_id: r.criterion_id,
          score: r.score,
          notes: r.notes || '',
          red_flags: r.red_flags || ''
        }
      })
      setResponses(responsesMap)
    } catch (error) {
      console.error('Error loading responses:', error)
    }
  }

  const updateResponse = (criterionId: string, updates: Partial<Response>) => {
    setResponses(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterion_id: criterionId,
        score: prev[criterionId]?.score || null,
        notes: prev[criterionId]?.notes || '',
        red_flags: prev[criterionId]?.red_flags || '',
        ...updates
      }
    }))
    
    // Auto-save after update
    setTimeout(() => saveAssessment(), 500)
  }

  const calculatePillarScore = (pillarId: string) => {
    const pillarCriteria = criteria.filter(c => c.pillar_id === pillarId)
    let totalWeightedScore = 0
    let totalWeight = 0

    pillarCriteria.forEach(criterion => {
      const response = responses[criterion.id]
      if (response?.score !== null && response?.score !== undefined) {
        totalWeightedScore += (response.score / 5) * criterion.criterion_weight
        totalWeight += criterion.criterion_weight
      }
    })

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0
  }

  const calculateOverallScore = () => {
    let totalWeightedScore = 0
    pillars.forEach(pillar => {
      const pillarScore = calculatePillarScore(pillar.id)
      totalWeightedScore += (pillarScore / 100) * pillar.pillar_weight
    })
    return totalWeightedScore * 100
  }

  const getCategoryFromScore = (score: number) => {
    if (score >= 80) return { name: 'Advanced', color: 'text-green-600 bg-green-100' }
    if (score >= 60) return { name: 'Intermediate', color: 'text-blue-600 bg-blue-100' }
    return { name: 'Basic', color: 'text-amber-600 bg-amber-100' }
  }

  const hasCriticalFailures = () => {
    return criteria.some(criterion => {
      if (!criterion.is_critical) return false
      const response = responses[criterion.id]
      return response?.score !== null && response.score <= 2
    })
  }

  const getAllQuestionsAnswered = () => {
    return criteria.every(c => responses[c.id]?.score !== null && responses[c.id]?.score !== undefined)
  }

  const saveAssessment = async () => {
    if (!selectedCandidate || !assessment) return

    setSaving(true)
    try {
      let assessmentId = assessment.id

      if (!assessmentId) {
        const { data: newAssessment, error } = await supabase
          .from('assessments')
          .insert({
            candidate_id: selectedCandidate.id,
            interviewer_id: user?.id,
            interview_date: assessment.interview_date,
            status: 'draft'
          })
          .select()
          .single()

        if (error) throw error
        assessmentId = newAssessment.id
        setAssessment(prev => prev ? { ...prev, id: assessmentId } : null)
      }

      // Save responses
      const responsesToSave = Object.values(responses).map(r => ({
        assessment_id: assessmentId,
        criterion_id: r.criterion_id,
        score: r.score,
        notes: r.notes,
        red_flags: r.red_flags
      }))

      await supabase.from('responses').upsert(responsesToSave)

      // Calculate and save summary
      const overallScore = calculateOverallScore()
      const aggregateScore = overallScore / 20
      const onboardRecommendation = overallScore >= 70 && !hasCriticalFailures()

      await supabase
        .from('assessments')
        .update({
          overall_percentage: overallScore,
          aggregate_score: aggregateScore,
          onboard_recommendation: onboardRecommendation
        })
        .eq('id', assessmentId)

      showToast('Assessment saved successfully', 'success')
    } catch (error) {
      console.error('Error saving assessment:', error)
      showToast('Failed to save assessment', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateCandidateStatus = async (newStatus: string) => {
    if (!selectedCandidate) return

    try {
      await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', selectedCandidate.id)

      setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null)
      showToast('Status updated successfully', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const selectedPillarCriteria = criteria.filter(c => c.pillar_id === selectedPillar)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow h-96"></div>
        </div>
      </div>
    )
  }

  if (showCandidateSelection) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nestara Nanny Assessment</h1>
            <p className="text-gray-600">Comprehensive vetting workflow for candidate evaluation</p>
          </div>
          <button
            onClick={() => setShowVetModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Vet Candidate
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.assessment_status === 'completed' ? 'bg-green-100 text-green-800' :
                        candidate.assessment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {candidate.assessment_status === 'completed' ? 'Completed' :
                         candidate.assessment_status === 'draft' ? 'Draft' : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.overall_percentage ? `${candidate.overall_percentage}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={async () => {
                          if (candidate.assessment_status === 'completed') {
                            setSelectedCandidate(candidate)
                            // Load assessment and responses for summary
                            const { data: assessmentData } = await supabase
                              .from('assessments')
                              .select('*')
                              .eq('id', candidate.assessment_id)
                              .single()
                            
                            if (assessmentData) {
                              setAssessment(assessmentData)
                              await loadResponses(assessmentData.id)
                            }
                            setShowSummaryModal(true)
                          } else {
                            setSelectedCandidate(candidate)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        {candidate.assessment_status === 'completed' ? 'View Summary' : 
                         candidate.assessment_status === 'none' ? 'Start Assessment' : 'Continue'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCandidates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No candidates found matching your criteria.
            </div>
          )}
        </div>

        {/* Vet Candidate Modal */}
        {showVetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Candidate to Vet
                </h2>

                <div className="mb-4">
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <select
                    onChange={(e) => {
                      const candidate = candidates.find(c => c.id === e.target.value)
                      if (candidate) {
                        setSelectedCandidate(candidate)
                        setShowVetModal(false)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    size={8}
                  >
                    <option value="">Choose a candidate...</option>
                    {candidates
                      .filter(candidate => 
                        modalSearchTerm === '' || 
                        candidate.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                        candidate.phone.includes(modalSearchTerm)
                      )
                      .map(candidate => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} - {candidate.phone} ({candidate.status})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowVetModal(false)
                      setModalSearchTerm('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {showSummaryModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Assessment Summary - {selectedCandidate.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSummaryModal(false)
                      setSelectedCandidate(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Overall Score</h3>
                    <div className="text-3xl font-bold text-blue-600">
                      {calculateOverallScore().toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-700">
                      ({(calculateOverallScore() / 20).toFixed(1)}/5)
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    hasCriticalFailures() ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      hasCriticalFailures() ? 'text-red-900' : 'text-green-900'
                    }`}>
                      Recommendation
                    </h3>
                    <div className={`text-lg font-bold ${
                      hasCriticalFailures() ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {calculateOverallScore() >= 70 && !hasCriticalFailures() ? 'ONBOARD' : 'DO NOT ONBOARD'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Pillar Breakdown</h3>
                  <div className="space-y-3">
                    {pillars.map(pillar => {
                      const score = calculatePillarScore(pillar.id)
                      const category = getCategoryFromScore(score)
                      return (
                        <div key={pillar.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{pillar.name}</div>
                            <div className="text-sm text-gray-600">Weight: {(pillar.pillar_weight * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{score.toFixed(1)}%</div>
                            <div className={`text-xs px-2 py-1 rounded-full ${category.color}`}>
                              {category.name}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowSummaryModal(false)
                      setSelectedCandidate(null)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedCandidate(null)
              setShowCandidateSelection(true)
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Selection
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment: {selectedCandidate?.name}
          </h1>
        </div>
        
        {selectedCandidate && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDetailsDrawer(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adjust Details
            </button>
          </div>
        )}
      </div>

      {selectedCandidate && (
        <div className="flex gap-6">
          {/* Left Navigation */}
          <div className="w-56 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Assessment Pillars</h3>
            <nav className="space-y-1">
              {pillars.map(pillar => {
                const score = calculatePillarScore(pillar.id)
                const category = getCategoryFromScore(score)
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setSelectedPillar(pillar.id)}
                    className={`w-full text-left p-2 rounded transition-colors hover:bg-gray-50 ${
                      selectedPillar === pillar.id
                        ? 'border-l-2 border-blue-500 bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{pillar.name}</div>
                    <div className="text-xs text-gray-500">
                      {score.toFixed(1)}% - {category.name}
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Overall Score</div>
              <div className="text-lg font-bold text-nestalk-primary">
                {calculateOverallScore().toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                ({(calculateOverallScore() / 20).toFixed(1)}/5)
              </div>
            </div>
          </div>

          {/* Main Assessment Area */}
          <div className="flex-1">
            {selectedPillarCriteria.length > 0 && (
              <div>
                {(() => {
                  const criterion = selectedPillarCriteria[currentCriterionIndex]
                  if (!criterion) return null
                  
                  const response = responses[criterion.id] || { criterion_id: criterion.id, score: null, notes: '', red_flags: '' }
                  const criterionScore = response.score ? (response.score / 5) * 100 : 0
                  const hasCriticalIssue = criterion.is_critical && response.score !== null && response.score <= 2

                  return (
                    <div className={`bg-white rounded-lg shadow-sm border p-6 ${
                      hasCriticalIssue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      {hasCriticalIssue && (
                        <div className="flex items-center mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                          <span className="text-red-800 font-medium">Critical Issue - Review Required</span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">
                            Question {currentCriterionIndex + 1} of {selectedPillarCriteria.length}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{criterion.name}</h3>
                          {criterion.is_critical && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Score</div>
                          <div className="text-lg font-bold text-nestalk-primary">
                            {criterionScore.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Why it matters</h4>
                            <p className="text-sm text-gray-600">{criterion.why_it_matters}</p>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">How to assess</h4>
                            <p className="text-sm text-gray-600">{criterion.how_to_assess}</p>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Interviewer Question</h4>
                            <p className="text-sm font-medium text-gray-900 bg-blue-50 p-3 rounded-lg">
                              {criterion.interviewer_question}
                            </p>
                          </div>

                          {criterion.red_flag_hints && (
                            <div>
                              <h4 className="font-medium text-red-700 mb-2">Red Flag Hints</h4>
                              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                {criterion.red_flag_hints}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Score (1-5)</h4>
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map(score => (
                                <label key={score} className="flex items-center">
                                  <input
                                    type="radio"
                                    name={`score-${criterion.id}`}
                                    value={score}
                                    checked={response.score === score}
                                    onChange={() => updateResponse(criterion.id, { score })}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{score}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                              <div>1: {criterion.guidance_1}</div>
                              <div>2: {criterion.guidance_2}</div>
                              <div>3: {criterion.guidance_3}</div>
                              <div>4: {criterion.guidance_4}</div>
                              <div>5: {criterion.guidance_5}</div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes/Evidence
                            </label>
                            <textarea
                              value={response.notes}
                              onChange={(e) => updateResponse(criterion.id, { notes: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                              placeholder="Record observations and evidence..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-2">
                              Red Flags (if any)
                            </label>
                            <textarea
                              value={response.red_flags}
                              onChange={(e) => updateResponse(criterion.id, { red_flags: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Note any concerning responses or behaviors..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setCurrentCriterionIndex(Math.max(0, currentCriterionIndex - 1))}
                          disabled={currentCriterionIndex === 0}
                          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Back
                        </button>
                        
                        {currentCriterionIndex === selectedPillarCriteria.length - 1 && selectedPillar === pillars[pillars.length - 1]?.id ? (
                          <button
                            onClick={async () => {
                              const allAnswered = criteria.every(c => responses[c.id]?.score !== null && responses[c.id]?.score !== undefined)
                              if (!allAnswered) {
                                showToast('Please answer all questions before completing', 'error')
                                return
                              }
                              
                              await supabase
                                .from('assessments')
                                .update({ status: 'completed' })
                                .eq('id', assessment?.id)
                              
                              showToast('Assessment completed successfully', 'success')
                              await loadInitialData()
                              setSelectedCandidate(null)
                              setShowCandidateSelection(true)
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Complete Assessment
                          </button>
                        ) : currentCriterionIndex === selectedPillarCriteria.length - 1 ? (
                          <button
                            onClick={() => {
                              const currentPillarIndex = pillars.findIndex(p => p.id === selectedPillar)
                              if (currentPillarIndex < pillars.length - 1) {
                                setSelectedPillar(pillars[currentPillarIndex + 1].id)
                                setCurrentCriterionIndex(0)
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Next Pillar →
                          </button>
                        ) : (
                          <button
                            onClick={() => setCurrentCriterionIndex(Math.min(selectedPillarCriteria.length - 1, currentCriterionIndex + 1))}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()
              }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {showDetailsDrawer && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Candidate Details - {selectedCandidate.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={candidateDetails.years_experience}
                    onChange={(e) => setCandidateDetails(prev => ({
                      ...prev,
                      years_experience: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ages Experienced (select multiple)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ageOptions.map(age => (
                      <label key={age} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={candidateDetails.ages_experienced.includes(age)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCandidateDetails(prev => ({
                                ...prev,
                                ages_experienced: [...prev.ages_experienced, age]
                              }))
                            } else {
                              setCandidateDetails(prev => ({
                                ...prev,
                                ages_experienced: prev.ages_experienced.filter(a => a !== age)
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{age}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await supabase
                        .from('candidates')
                        .update(candidateDetails)
                        .eq('id', selectedCandidate.id)
                      
                      setSelectedCandidate(prev => prev ? { ...prev, ...candidateDetails } : null)
                      setShowDetailsDrawer(false)
                      showToast('Details updated successfully', 'success')
                    } catch (error) {
                      showToast('Failed to update details', 'error')
                    }
                  }}
                  className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
