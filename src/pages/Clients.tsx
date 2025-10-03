import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SearchFilter } from '../components/ui/SearchFilter'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CommunicationsModal } from '../components/ui/CommunicationsModal'
import { Plus, Building2, Calendar, User, MessageSquare, Eye, Edit, AlertTriangle, ChevronDown, Clock, X, Pencil, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ActivityLogger } from '../lib/activityLogger'

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

interface StatusOption {
  label: string
  color: string
  subcategories?: string[]
  parent?: string
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
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedClientForStatus, setSelectedClientForStatus] = useState<Client | null>(null)
  const [statusForm, setStatusForm] = useState({ mainStatus: '', subStatus: '' })
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gmail: '',
    source: '',
    want_to_hire: '',
    status: 'Pending',
    substatus: 'Form not filled', // Default substatus for Pending
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  // Exact status system as specified
  const statusOptions: Record<string, StatusOption> = {
    'Pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', subcategories: [
      'Form not filled',
      'PAF not PAID', 
      'Silent after profiles'
    ]},
    'Form not filled': { label: 'Form not filled', color: 'bg-yellow-100 text-yellow-800', parent: 'Pending' },
    'PAF not PAID': { label: 'PAF not PAID', color: 'bg-yellow-100 text-yellow-800', parent: 'Pending' },
    'Silent after profiles': { label: 'Silent after profiles', color: 'bg-yellow-100 text-yellow-800', parent: 'Pending' },
    
    'Active': { label: 'Active', color: 'bg-blue-100 text-blue-800', subcategories: [
      'Form filled, no response yet',
      'Communication ongoing',
      'Payment pending'
    ]},
    'Form filled, no response yet': { label: 'Form filled, no response yet', color: 'bg-blue-100 text-blue-800', parent: 'Active' },
    'Communication ongoing': { label: 'Communication ongoing', color: 'bg-blue-100 text-blue-800', parent: 'Active' },
    'Payment pending': { label: 'Payment pending', color: 'bg-blue-100 text-blue-800', parent: 'Active' },
    
    'Lost/Cold': { label: 'Lost/Cold', color: 'bg-red-100 text-red-800', subcategories: [
      'Ghosted',
      'Budget constraints', 
      'Disappointed with profiles'
    ]},
    'Ghosted': { label: 'Ghosted', color: 'bg-red-100 text-red-800', parent: 'Lost/Cold' },
    'Budget constraints': { label: 'Budget constraints', color: 'bg-red-100 text-red-800', parent: 'Lost/Cold' },
    'Disappointed with profiles': { label: 'Disappointed with profiles', color: 'bg-red-100 text-red-800', parent: 'Lost/Cold' },
    
    'Won': { label: 'Won', color: 'bg-green-100 text-green-800' }
  }
  
  const statusOptionsList = Object.keys(statusOptions)
  const mainStatusOptions = ['Pending', 'Active', 'Lost/Cold', 'Won']
  
  // Source options (same as candidates table)
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']
  
  // Role options (updated as requested)  
  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper', 'Uniforms']

  // Time options for business hours (8am-5pm) - Currently used for display reference
  // Note: Reminders are set via date picker only, default time is 9:00 AM
  const businessHours = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00'
  ]

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
  // Helper function to format date for logging with "Tue, 24th June 2025" format
  const formatDateForLogging = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    const dayOfWeek = date.toLocaleString('default', { weekday: 'short' })
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th'
    return `${dayOfWeek}, ${day}${suffix} ${month} ${year}`
  }

  // Helper function to check if client needs attention - ONLY for reminders
  const needsAttention = (client: Client): boolean => {
    // Only check custom reminder datetime
    if (client.custom_reminder_datetime) {
      const now = new Date()
      const reminderTime = new Date(client.custom_reminder_datetime)
      if (now >= reminderTime) return true
    }
    
    return false
  }

  // Helper function to format status for display
  const getStatusDisplay = (status: string) => {
    return statusOptions[status]?.label || status
  }

  // Helper function to get the final status for saving
  const getFinalStatus = () => {
    if (statusOptions[formData.status]?.subcategories && formData.substatus) {
      return `${formData.status} - ${formData.substatus}`
    }
    return formData.status
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

      // fetch existing phones to avoid duplicates
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

          if (!statusOptionsList.includes(status)) {
            errors.push(`Row ${i + 2}: Invalid status '${status}'. Must be one of: ${statusOptionsList.join(', ')}`)
            continue
          }

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
            status, 
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

      // Log the bulk upload activity
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
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => loadClients()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.gmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.want_to_hire.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => {
        // Handle both "MainStatus" and "MainStatus - SubStatus" formats
        if (client.status === filterStatus) {
          return true // Exact match for main status
        }
        // Check if the status starts with the main status followed by " - "
        if (client.status.startsWith(`${filterStatus} - `)) {
          return true // Status is "MainStatus - SubStatus" format
        }
        return false
      })
    }

    setFilteredClients(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: If main status has subcategories, require substatus selection
    if (statusOptions[formData.status]?.subcategories && !formData.substatus) {
      showToast(`Please select a specific ${formData.status.toLowerCase()} status`, 'error')
      return
    }
    
    try {
      const finalStatus = getFinalStatus()

      if (selectedClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            phone: formData.phone,
            gmail: formData.gmail,
            source: formData.source,
            want_to_hire: formData.want_to_hire,
            status: finalStatus,
          })
          .eq('id', selectedClient.id)

        if (error) throw error

        // Log the activity
        if (staff?.id && staff?.name) {
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
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            phone: formData.phone,
            gmail: formData.gmail,
            source: formData.source,
            want_to_hire: formData.want_to_hire,
            status: finalStatus,
          })

        if (error) throw error
        
        // Log the activity for new client creation
        if (staff?.id && staff?.name) {
          await ActivityLogger.logCreate(
            staff.id,
            'client',
            'new', // We don't have the ID yet, but we'll use 'new'
            formData.name,
            staff.name
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
      status: 'Pending',
      substatus: 'Form not filled', // Default substatus for Pending
    })
    setSelectedClient(null)
  }

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    // Determine if the client status is a subcategory
    const statusOption = statusOptions[client.status]
    const isSubcategory = statusOption?.parent !== undefined
    const mainStatus = isSubcategory ? statusOption?.parent : client.status
    const subStatus = isSubcategory ? client.status : ''
    
    setFormData({
      name: client.name,
      phone: client.phone,
      gmail: client.gmail,
      source: client.source || 'Referral',
      want_to_hire: client.want_to_hire,
      status: mainStatus || 'Pending',
      substatus: subStatus,
    })
    setShowModal(true)
  }

  const handleViewComms = (client: Client) => {
    setSelectedClient(client)
    setShowCommsModal(true)
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

      // Log the reminder activity
      if (staff?.id && staff?.name) {
        const oldReminder = selectedClientForReminder.custom_reminder_datetime
        if (oldReminder && custom_reminder_datetime) {
          // Rescheduling reminder
          const formatDateForLogging = (dateString: string) => {
            const date = new Date(dateString)
            const day = date.getDate()
            const month = date.toLocaleString('default', { month: 'long' })
            const year = date.getFullYear()
            const dayOfWeek = date.toLocaleString('default', { weekday: 'short' })
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                           day === 2 || day === 22 ? 'nd' :
                           day === 3 || day === 23 ? 'rd' : 'th'
            return `${dayOfWeek}, ${day}${suffix} ${month} ${year}`
          }
          
          await ActivityLogger.log({
            userId: staff.id,
            actionType: 'reschedule',
            entityType: 'client',
            entityId: selectedClientForReminder.id,
            entityName: selectedClientForReminder.name,
            oldValue: formatDateForLogging(oldReminder),
            newValue: formatDateForLogging(custom_reminder_datetime),
            description: `${staff.name}: rescheduled reminder for Client "${selectedClientForReminder.name}" from ${formatDateForLogging(oldReminder)} to ${formatDateForLogging(custom_reminder_datetime)}`
          })
        } else if (custom_reminder_datetime) {
          // Setting new reminder
          const formatDateForLogging = (dateString: string) => {
            const date = new Date(dateString)
            const day = date.getDate()
            const month = date.toLocaleString('default', { month: 'long' })
            const year = date.getFullYear()
            const dayOfWeek = date.toLocaleString('default', { weekday: 'short' })
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                           day === 2 || day === 22 ? 'nd' :
                           day === 3 || day === 23 ? 'rd' : 'th'
            return `${dayOfWeek}, ${day}${suffix} ${month} ${year}`
          }
          
          await ActivityLogger.log({
            userId: staff.id,
            actionType: 'edit',
            entityType: 'client',
            entityId: selectedClientForReminder.id,
            entityName: selectedClientForReminder.name,
            description: `${staff.name}: set reminder for Client "${selectedClientForReminder.name}" on ${formatDateForLogging(custom_reminder_datetime)}`
          })
        }
      }

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

  const handleReminderCancel = () => {
    setShowReminderModal(false)
    setSelectedClientForReminder(null)
    setReminderForm({ date: '', time: '' })
  }

  const handleReminderDelete = async (clientId: string) => {
    try {
      // Get client info for logging
      const client = clients.find(c => c.id === clientId)
      
      const { error } = await supabase
        .from('clients')
        .update({ custom_reminder_datetime: null })
        .eq('id', clientId)

      if (error) throw error

      // Log the reminder cancellation
      if (staff?.id && staff?.name && client) {
        await ActivityLogger.log({
          userId: staff.id,
          actionType: 'edit',
          entityType: 'client',
          entityId: clientId,
          entityName: client.name,
          description: `${staff.name}: cancelled reminder for Client "${client.name}"`
        })
      }

      await loadClients()
      showToast('Reminder cancelled successfully', 'success')
    } catch (error) {
      console.error('Error cancelling reminder:', error)
      showToast('Failed to cancel reminder', 'error')
    }
  }

  const handleStatusEdit = (client: Client) => {
    setSelectedClientForStatus(client)
    
    // Parse MainStatus - SubStatus format
    if (client.status.includes(' - ')) {
      const [mainStatus, subStatus] = client.status.split(' - ')
      setStatusForm({
        mainStatus: mainStatus.trim(),
        subStatus: subStatus.trim()
      })
    } else {
      // Handle single status (like "Won" or legacy statuses)
      const statusOption = statusOptions[client.status]
      const isSubcategory = statusOption?.parent !== undefined
      const mainStatus = isSubcategory ? statusOption?.parent : client.status
      const subStatus = isSubcategory ? client.status : ''
      
      setStatusForm({
        mainStatus: mainStatus || 'Pending',
        subStatus: subStatus
      })
    }
    
    setShowStatusModal(true)
  }

  const handleStatusSave = async () => {
    if (!selectedClientForStatus) return
    
    // Validation
    if (!statusForm.mainStatus) {
      showToast('Please select a main status', 'error')
      return
    }
    
    if (statusForm.mainStatus !== 'Won' && statusOptions[statusForm.mainStatus]?.subcategories && !statusForm.subStatus) {
      showToast(`Please select a ${statusForm.mainStatus.toLowerCase()} substatus`, 'error')
      return
    }
    
    try {
      let finalStatus = statusForm.mainStatus
      
      // Format as "MainStatus - SubStatus" if sub-status is selected
      if (statusForm.subStatus) {
        finalStatus = `${statusForm.mainStatus} - ${statusForm.subStatus}`
      }
      
      console.log('Attempting to update status:', {
        clientId: selectedClientForStatus.id,
        currentStatus: selectedClientForStatus.status,
        newStatus: finalStatus,
        mainStatus: statusForm.mainStatus,
        subStatus: statusForm.subStatus
      })
      
      // Test basic connectivity first
      console.log('Testing Supabase connection...')
      const { data: testData, error: testError } = await supabase
        .from('clients')
        .select('id, status')
        .eq('id', selectedClientForStatus.id)
        .single()
      
      if (testError) {
        console.error('Connection test failed:', testError)
        throw new Error(`Database connection failed: ${testError.message}`)
      }
      
      console.log('Connection test successful:', testData)
      
      const { data, error } = await supabase
        .from('clients')
        .update({ 
          status: finalStatus,
          custom_reminder_datetime: null // Auto-cancel reminder when status is updated
        })
        .eq('id', selectedClientForStatus.id)
        .select() // Return the updated record

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Update successful:', data)
      
      // Log the activity
      if (staff?.id && staff?.name) {
        await ActivityLogger.logStatusChange(
          staff.id,
          'client',
          selectedClientForStatus.id,
          selectedClientForStatus.name,
          selectedClientForStatus.status,
          finalStatus,
          staff.name
        )
      }

      await loadClients()
      setShowStatusModal(false)
      setSelectedClientForStatus(null)
      setStatusForm({ mainStatus: '', subStatus: '' })
      showToast('Status updated successfully', 'success')
    } catch (error) {
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      
      let errorMessage = 'Unknown error'
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message)
        } else if ('error' in error) {
          errorMessage = String(error.error)
        } else if ('details' in error) {
          errorMessage = String(error.details)
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      showToast(`Failed to update status: ${errorMessage}`, 'error')
    }
  }

  const handleStatusCancel = () => {
    setShowStatusModal(false)
    setSelectedClientForStatus(null)
    setStatusForm({ mainStatus: '', subStatus: '' })
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
        statusOptions={mainStatusOptions}
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
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Lost/Cold">Lost/Cold</option>
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
                      <div className="flex items-center gap-2">
                        <StatusBadge status={client.status} type="client" />
                        {(() => {
                          const timeInfo = client.custom_reminder_datetime ? getTimeUntilReminder(client.custom_reminder_datetime) : null
                          return timeInfo?.overdue && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ⚠️ Needs Attention
                            </span>
                          )
                        })()} 
                      </div>
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
                        <button
                          onClick={() => handleStatusEdit(client)}
                          className="text-gray-600 hover:text-gray-800 text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          title="Update Status"
                        >
                          Update Status
                        </button>
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
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      const newSubstatus = statusOptions[newStatus]?.subcategories?.[0] || '';
                      setFormData({ ...formData, status: newStatus, substatus: newSubstatus })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  >
                    {mainStatusOptions.map(status => (
                      <option key={status} value={status}>
                        {getStatusDisplay(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional substatus dropdown */}
                {statusOptions[formData.status]?.subcategories && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.status} Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.substatus}
                      onChange={(e) => setFormData({ ...formData, substatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                    >
                      <option value="">Select {formData.status.toLowerCase()} status</option>
                      {statusOptions[formData.status].subcategories?.map(substatus => (
                        <option key={substatus} value={substatus}>
                          {substatus}
                        </option>
                      ))}
                    </select>
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
                    {selectedClient ? 'Update' : 'Add'} Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Communications Modal */}
      <CommunicationsModal
        isOpen={showCommsModal}
        onClose={() => setShowCommsModal(false)}
        linkedToType="client"
        linkedToId={selectedClient?.id || ''}
        linkedToName={selectedClient?.name || ''}
      />

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
                    <li>Custom Reminder Date (optional, YYYY-MM-DD, time can be set later in table)</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Set specific reminder times directly in the table after upload
                  </p>
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
                  placeholder="mm/dd/yyyy"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <select
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={6}
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="08:30">08:30 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="13:30">01:30 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="16:30">04:30 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleReminderSave}
                disabled={!reminderForm.date || !reminderForm.time}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={handleReminderCancel}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Status
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Status</label>
                <select
                  value={statusForm.mainStatus}
                  onChange={(e) => {
                    setStatusForm({ 
                      mainStatus: e.target.value, 
                      subStatus: e.target.value === 'Won' ? '' : statusForm.subStatus 
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Main Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Lost/Cold">Lost/Cold</option>
                  <option value="Won">Won</option>
                </select>
              </div>
              
              {statusForm.mainStatus && statusForm.mainStatus !== 'Won' && statusOptions[statusForm.mainStatus]?.subcategories && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {statusForm.mainStatus} Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={statusForm.subStatus}
                    onChange={(e) => setStatusForm({ ...statusForm, subStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select {statusForm.mainStatus} Status</option>
                    {statusOptions[statusForm.mainStatus].subcategories?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleStatusSave}
                disabled={!statusForm.mainStatus || (statusForm.mainStatus !== 'Won' && statusOptions[statusForm.mainStatus]?.subcategories && !statusForm.subStatus)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={(!statusForm.mainStatus || (statusForm.mainStatus !== 'Won' && statusOptions[statusForm.mainStatus]?.subcategories && !statusForm.subStatus)) ? 'Please select both main status and substatus' : 'Update status'}
              >
                Update
              </button>
              <button
                onClick={handleStatusCancel}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clients