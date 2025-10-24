import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CommunicationsModal } from '../components/ui/CommunicationsModal'
import { Plus, Building2, Calendar, User, MessageSquare, Eye, Edit, AlertTriangle, ChevronDown, Clock, X, Pencil, Upload } from 'lucide-react'
import { PhoneInput } from '../components/ui/PhoneInput'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'
import { formatDateTime } from '../utils/dateFormat'
import { StatusHistoryLogger } from '../lib/statusHistory'

interface Client {
  id: string
  name: string
  phone: string
  gmail: string
  source: string
  want_to_hire: string
  status: string
  inquiry_date: string
  custom_reminder_datetime: string | null
  created_at: string
  updated_at: string
}

export function Clients() {
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
    status: 'Pending - No Comms'
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  // Status system without plain options
  const statusOptions = {
    'Pending - No Comms': { label: 'Pending - No Comms', color: 'bg-yellow-100 text-yellow-800' },
    'Pending - Form not filled': { label: 'Pending - Form not filled', color: 'bg-yellow-100 text-yellow-800' },
    'Pending - PAF not PAID': { label: 'Pending - PAF not PAID', color: 'bg-yellow-100 text-yellow-800' },
    'Pending - Silent after profiles': { label: 'Pending - Silent after profiles', color: 'bg-yellow-100 text-yellow-800' },
    
    'Active - Form filled, no response yet': { label: 'Active - Form filled, no response yet', color: 'bg-blue-100 text-blue-800' },
    'Active - Communication ongoing': { label: 'Active - Communication ongoing', color: 'bg-blue-100 text-blue-800' },
    'Active - Payment pending': { label: 'Active - Payment pending', color: 'bg-blue-100 text-blue-800' },
    
    'Lost/Cold - Ghosted': { label: 'Lost/Cold - Ghosted', color: 'bg-red-100 text-red-800' },
    'Lost/Cold - Budget constraints': { label: 'Lost/Cold - Budget constraints', color: 'bg-red-100 text-red-800' },
    'Lost/Cold - Disappointed with profiles': { label: 'Lost/Cold - Disappointed with profiles', color: 'bg-red-100 text-red-800' },
    'Lost/Cold - Lost to Competition': { label: 'Lost/Cold - Lost to Competition', color: 'bg-red-100 text-red-800' },
    
    'Won': { label: 'Won', color: 'bg-green-100 text-green-800' }
  }
  
  const statusOptionsList = Object.keys(statusOptions)
  const pendingOptions = ['Pending - No Comms', 'Pending - Form not filled', 'Pending - PAF not PAID', 'Pending - Silent after profiles']
  const activeOptions = ['Active - Form filled, no response yet', 'Active - Communication ongoing', 'Active - Payment pending']
  const lostOptions = ['Lost/Cold - Ghosted', 'Lost/Cold - Budget constraints', 'Lost/Cold - Disappointed with profiles', 'Lost/Cold - Lost to Competition']
  
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
    const csvContent = `Name,Phone,Gmail,Source,Want to Hire,Status,Custom Reminder Date (YYYY-MM-DD)\nJohn Doe,555-1234,john@example.com,Referral,Nanny,Pending,\nJane Smith,555-5678,jane@example.com,TikTok,Chef,Active,2025-09-30\nMary Johnson,555-9999,mary@example.com,Youtube,Housekeeper,Pending,\nBob Wilson,555-7777,bob@example.com,Facebook,Uniforms,Active,`
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
      const reminderIdx = headerCols.findIndex(col => col.includes('reminder') || col.includes('date'))
      
      if (nameIdx === -1 || phoneIdx === -1 || gmailIdx === -1) {
        showToast('CSV missing required columns. Please ensure your CSV has columns for Name, Phone, and Gmail', 'error')
        setSubmitting(false)
        return
      }

      const { data: existing, error: fetchError } = await supabase.from('clients').select('phone')
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
          const reminder = parts[reminderIdx]?.trim().replace(/"/g, '')

          if (!name || !phone || !gmail) {
            errors.push(`Row ${i + 2}: Missing required fields (Name, Phone, Gmail)`)
            continue
          }

          if (existingSet.has(phone)) {
            errors.push(`Row ${i + 2}: Phone number ${phone} already exists`)
            continue
          }

          if (!sourceOptions.includes(source)) {
            errors.push(`Row ${i + 2}: Invalid source '${source}'. Must be one of: ${sourceOptions.join(', ')}`)
            continue
          }

          if (!roleOptions.includes(want_to_hire)) {
            errors.push(`Row ${i + 2}: Invalid role '${want_to_hire}'. Must be one of: ${roleOptions.join(', ')}`)
            continue
          }

          if (!statusOptionsList.includes(status) && status !== 'Pending' && status !== 'Active' && status !== 'Lost/Cold') {
            errors.push(`Row ${i + 2}: Invalid status '${status}'. Must be one of: ${statusOptionsList.join(', ')}`)
            continue
          }
          
          // Convert legacy statuses
          let finalStatus = status
          if (status === 'Pending') finalStatus = 'Pending - No Comms'
          if (status === 'Active') finalStatus = 'Active - Communication ongoing'
          if (status === 'Lost/Cold') finalStatus = 'Lost/Cold - Ghosted'

          existingSet.add(phone)

          const custom_reminder_datetime = reminder
            ? new Date(`${reminder}T09:00:00`).toISOString()
            : null
          
          inserts.push({ 
            name, 
            phone, 
            gmail,
            source,
            want_to_hire, 
            status: finalStatus, 
            custom_reminder_datetime,
            inquiry_date: new Date().toISOString().split('T')[0],
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
      status: 'Pending - No Comms'
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage client inquiries and staffing requests</p>
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
        statusOptions={['Pending', 'Active', 'Lost/Cold', 'Won']}
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
              <optgroup label="Pending">
                {pendingOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </optgroup>
              <optgroup label="Active">
                {activeOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </optgroup>
              <optgroup label="Lost/Cold">
                {lostOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </optgroup>
              <option value="Won">Won</option>
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
                          disabled={client.status === 'Won'}
                          className={`px-2 py-1 border border-gray-300 rounded text-sm ${
                            client.status === 'Won' 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-white'
                          }`}
                          defaultValue=""
                        >
                          <option value="" disabled>Update Status</option>
                          <optgroup label="Pending">
                            {pendingOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Active">
                            {activeOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Lost/Cold">
                            {lostOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </optgroup>
                          <option value="Won">Won</option>
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
                {selectedClient ? 'Edit Client' : 'Add New Client'}
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
                    disabled={selectedClient && selectedClient.status === 'Won'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent ${
                      selectedClient && selectedClient.status === 'Won'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <optgroup label="Pending">
                      {pendingOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Active">
                      {activeOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Lost/Cold">
                      {lostOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </optgroup>
                    <option value="Won">Won</option>
                  </select>
                  {selectedClient && selectedClient.status === 'Won' && (
                    <p className="text-xs text-gray-500 mt-1">Status locked - Won clients cannot change status</p>
                  )}
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
                    {selectedClient ? 'Update' : 'Add'} Client
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
                Bulk Upload Clients
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
                    <li>Custom Reminder Date (optional, YYYY-MM-DD)</li>
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

export default Clients