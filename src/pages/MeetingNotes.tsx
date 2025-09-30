import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Plus, Edit, Check, X, Trash2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ActivityLogger } from '../lib/activityLogger'

interface MeetingNote {
  id: string
  title: string
  meeting_date: string
  notes: string[]
  created_by: string
  created_at: string
  staff?: {
    name: string
    username: string
  }
  deliverables?: Deliverable[]
}

interface Deliverable {
  id: string
  meeting_note_id: string
  task_description: string
  assigned_to: string
  status: 'pending' | 'done'
  due_date?: string
  completed_at?: string
  completed_by?: string
  created_at: string
  assigned_staff?: {
    name: string
    username: string
  }
}

export function MeetingNotes() {
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [editingMeetingNote, setEditingMeetingNote] = useState<MeetingNote | null>(null)
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meeting_date: new Date().toISOString().split('T')[0],
    deliverable_groups: [{ // Array of text areas with assignments
      notes_text: '',
      assigned_to: ''
    }]
  })
  const [deliverableAssignments, setDeliverableAssignments] = useState<{[index: number]: string}>({})
  const [staffList, setStaffList] = useState<{id: string, name: string, username: string}[]>([])
  const [groupedMeetingNotes, setGroupedMeetingNotes] = useState<{[key: string]: MeetingNote[]}>({})
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [collapsedNotes, setCollapsedNotes] = useState<Set<string>>(new Set())
  
  const { user, staff } = useAuth()

  // Prevent duplicate users in same meeting note
  const validateUniqueAssignments = () => {
    const assignedUsers = meetingForm.deliverable_groups
      .map(group => group.assigned_to)
      .filter(userId => userId !== '')
    
    const uniqueUsers = new Set(assignedUsers)
    return uniqueUsers.size === assignedUsers.length
  }

  const toggleDayCollapsed = (date: string) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const toggleNoteCollapsed = (noteId: string) => {
    setCollapsedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  useEffect(() => {
    Promise.all([loadMeetingNotes(), loadStaffList()])
  }, [])

  const loadStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, username')
        .order('name')

      if (error) throw error
      setStaffList(data || [])
    } catch (error) {
      console.error('Error loading staff list:', error)
    }
  }

  const loadMeetingNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select(`
          *,
          staff:created_by (name, username),
          deliverables (
            *,
            assigned_staff:assigned_to (name, username)
          )
        `)
        .order('meeting_date', { ascending: false })

      if (error) throw error
      setMeetingNotes(data || [])
      
      // Group meeting notes by date
      const grouped = (data || []).reduce((acc: {[key: string]: MeetingNote[]}, note) => {
        const date = note.meeting_date
        if (!acc[date]) acc[date] = []
        acc[date].push(note)
        return acc
      }, {})
      
      setGroupedMeetingNotes(grouped)
    } catch (error) {
      console.error('Error loading meeting notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) {
      console.error('No user ID available')
      return
    }

    // Validate unique user assignments
    if (!validateUniqueAssignments()) {
      alert('Each user can only have one text area per meeting note. Please assign different users to each text area or remove duplicate assignments.')
      return
    }

    try {
      // Collect all notes from all deliverable groups
      const allNotes: string[] = []
      meetingForm.deliverable_groups.forEach(group => {
        const lines = group.notes_text
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line !== '')
        allNotes.push(...lines)
      })

      const meetingData = {
        title: meetingForm.title || `Meeting - ${new Date(meetingForm.meeting_date).toLocaleDateString()}`,
        meeting_date: meetingForm.meeting_date,
        notes: allNotes, // Save as array for display
        created_by: user.id
      }

      let meetingNoteId: string

      if (editingMeetingNote) {
        const { error } = await supabase
          .from('meeting_notes')
          .update(meetingData)
          .eq('id', editingMeetingNote.id)

        if (error) throw error
        meetingNoteId = editingMeetingNote.id
      } else {
        const { data, error } = await supabase
          .from('meeting_notes')
          .insert([meetingData])
          .select()
          .single()

        if (error) throw error
        meetingNoteId = data.id
      }

      // Create deliverables for each group
      const deliverablesToCreate: any[] = []
      const existingDeliverablesMap = new Map<string, Deliverable>()
      
      // Create a map of existing deliverables by task description for reference
      if (editingMeetingNote && editingMeetingNote.deliverables) {
        editingMeetingNote.deliverables.forEach(d => {
          existingDeliverablesMap.set(d.task_description, d)
        })
      }
      
      meetingForm.deliverable_groups.forEach(group => {
        const lines = group.notes_text
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line !== '')
        
        lines.forEach((line: string) => {
          // Check if this deliverable existed before and was marked as done
          const existingDeliverable = existingDeliverablesMap.get(line)
          
          deliverablesToCreate.push({
            meeting_note_id: meetingNoteId,
            task_description: line,
            assigned_to: group.assigned_to || user.id,
            status: existingDeliverable?.status || 'pending',
            ...(existingDeliverable?.status === 'done' && {
              completed_at: existingDeliverable.completed_at,
              completed_by: existingDeliverable.completed_by
            })
          })
        })
      })

      if (deliverablesToCreate.length > 0) {
        // Delete existing deliverables if editing
        if (editingMeetingNote) {
          await supabase
            .from('deliverables')
            .delete()
            .eq('meeting_note_id', meetingNoteId)
        }

        // Insert new deliverables
        const { error: deliverableError } = await supabase
          .from('deliverables')
          .insert(deliverablesToCreate)

        if (deliverableError) throw deliverableError
      }

      // Log the activity for meeting note creation/edit
      if (staff?.name) {
        if (editingMeetingNote) {
          await ActivityLogger.logEdit(
            user.id,
            'meeting_note',
            meetingNoteId,
            meetingData.title,
            staff.name
          )
        } else {
          await ActivityLogger.logCreate(
            user.id,
            'meeting_note',
            meetingNoteId,
            meetingData.title,
            staff.name
          )
        }
      }

      await loadMeetingNotes()
      setShowMeetingModal(false)
      setEditingMeetingNote(null)
      setMeetingForm({
        title: '',
        meeting_date: new Date().toISOString().split('T')[0],
        deliverable_groups: [{
          notes_text: '',
          assigned_to: ''
        }]
      })
      setDeliverableAssignments({})
    } catch (error) {
      console.error('Error saving meeting note:', error)
    }
  }

  const toggleDeliverable = async (deliverableId: string, currentStatus: 'pending' | 'done') => {
    try {
      const newStatus = currentStatus === 'pending' ? 'done' : 'pending'
      const updateData = {
        status: newStatus,
        ...(newStatus === 'done' ? {
          completed_at: new Date().toISOString(),
          completed_by: user?.id
        } : {
          completed_at: null,
          completed_by: null
        })
      }

      const { error } = await supabase
        .from('deliverables')
        .update(updateData)
        .eq('id', deliverableId)

      if (error) throw error
      
      // Log the activity
      if (user?.id && staff?.name) {
        const deliverable = meetingNotes
          .flatMap(note => note.deliverables || [])
          .find(d => d.id === deliverableId)
        
        if (deliverable) {
          await ActivityLogger.log({
            userId: user.id,
            actionType: 'edit',
            entityType: 'meeting_note',
            entityId: deliverable.meeting_note_id,
            entityName: deliverable.task_description,
            description: `${staff.name} marked deliverable "${deliverable.task_description}" as ${newStatus}`
          })
        }
      }
      
      await loadMeetingNotes()
    } catch (error) {
      console.error('Error updating deliverable:', error)
    }
  }

  const addDeliverableGroup = () => {
    setMeetingForm(prev => ({
      ...prev,
      deliverable_groups: [...prev.deliverable_groups, {
        notes_text: '',
        assigned_to: ''
      }]
    }))
  }

  const updateDeliverableGroup = (index: number, field: 'notes_text' | 'assigned_to', value: string) => {
    setMeetingForm(prev => ({
      ...prev,
      deliverable_groups: prev.deliverable_groups.map((group, i) => 
        i === index ? { ...group, [field]: value } : group
      )
    }))
  }

  const removeDeliverableGroup = (index: number) => {
    if (meetingForm.deliverable_groups.length > 1) {
      setMeetingForm(prev => ({
        ...prev,
        deliverable_groups: prev.deliverable_groups.filter((_, i) => i !== index)
      }))
    }
  }

  const openMeetingModal = (note?: MeetingNote) => {
    if (note) {
      setEditingMeetingNote(note)
      // Group deliverables by assigned user when editing
      const groups: {[key: string]: string[]} = {}
      
      if (note.deliverables && note.deliverables.length > 0) {
        note.deliverables.forEach(deliverable => {
          const assignedTo = deliverable.assigned_to
          if (!groups[assignedTo]) groups[assignedTo] = []
          groups[assignedTo].push(deliverable.task_description)
        })
      } else {
        // Fallback to notes if no deliverables
        const notesText = Array.isArray(note.notes) ? note.notes.join('\n') : (note.notes || '')
        groups[user?.id || ''] = [notesText]
      }
      
      const deliverableGroups = Object.entries(groups).map(([assignedTo, tasks]) => ({
        notes_text: tasks.join('\n'),
        assigned_to: assignedTo
      }))
      
      setMeetingForm({
        title: note.title,
        meeting_date: note.meeting_date,
        deliverable_groups: deliverableGroups.length > 0 ? deliverableGroups : [{
          notes_text: '',
          assigned_to: ''
        }]
      })
    } else {
      setEditingMeetingNote(null)
      setMeetingForm({
        title: '',
        meeting_date: new Date().toISOString().split('T')[0],
        deliverable_groups: [{
          notes_text: '',
          assigned_to: user?.id || ''
        }]
      })
    }
    setShowMeetingModal(true)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Notes</h1>
          <p className="text-gray-600">Track meeting discussions and deliverables</p>
        </div>
        <button
          onClick={() => openMeetingModal()}
          className="px-4 py-2 bg-nestalk-primary text-white rounded-md hover:bg-nestalk-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Meeting Note
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {Object.keys(groupedMeetingNotes).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedMeetingNotes)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, notes]) => (
                <div key={date} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleDayCollapsed(date)}
                    className="w-full bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {notes.length} {notes.length === 1 ? 'meeting' : 'meetings'}
                      </span>
                    </div>
                    {collapsedDays.has(date) ? (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {!collapsedDays.has(date) && (
                    <div className="divide-y divide-gray-200">
                      {notes.map((note) => (
                        <div key={note.id} className="p-4">
                          <button
                            onClick={() => toggleNoteCollapsed(note.id)}
                            className="flex items-center justify-between w-full mb-3 hover:bg-gray-50 p-2 rounded"
                          >
                            <h5 className="font-medium text-gray-900">{note.title}</h5>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                By: {note.staff?.name || 'Unknown'}
                              </span>
                              {collapsedNotes.has(note.id) ? (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          </button>
                          
                          {!collapsedNotes.has(note.id) && (
                            <>
                              {/* Meeting Notes Content - Show deliverables if they exist, otherwise show raw notes */}
                              {note.deliverables && note.deliverables.length > 0 ? (
                                <div className="space-y-2">
                                  {note.deliverables.map((deliverable) => (
                                    <div key={deliverable.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => toggleDeliverable(deliverable.id, deliverable.status)}
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                            deliverable.status === 'done'
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : 'border-gray-300 hover:border-green-500'
                                          }`}
                                        >
                                          {deliverable.status === 'done' && <Check className="w-3 h-3" />}
                                        </button>
                                        <span className={`text-sm ${
                                          deliverable.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-900'
                                        }`}>
                                          {deliverable.task_description}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                          {deliverable.assigned_staff?.name || 'Unassigned'}
                                        </span>
                                        {deliverable.status === 'done' && (
                                          <span className="text-xs text-green-600">✓ Done</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mb-4">
                                  {Array.isArray(note.notes) ? (
                                    <div className="space-y-2">
                                      {note.notes.map((item, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                          <span className="text-gray-400 mt-1">•</span>
                                          <span className="text-sm text-gray-700">{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-700">{note.notes}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => openMeetingModal(note)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No meeting notes yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first meeting note to track discussions and deliverables.
              </p>
              <button
                onClick={() => openMeetingModal()}
                className="mt-4 px-4 py-2 bg-nestalk-primary text-white rounded-md hover:bg-nestalk-primary/90 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add Meeting Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Notes Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMeetingNote ? 'Edit Meeting Note' : 'Add Meeting Note'}
              </h3>
              <button
                onClick={() => setShowMeetingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleMeetingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  placeholder="Meeting title (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, meeting_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Meeting Notes & Deliverables
                  </label>
                  <button
                    type="button"
                    onClick={addDeliverableGroup}
                    className="px-3 py-1 text-sm bg-nestalk-primary text-white rounded-md hover:bg-nestalk-primary/90 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Each text area represents a group of deliverables. Enter each deliverable on a new line and assign to a user.
                </p>
                
                <div className="space-y-4">
                  {meetingForm.deliverable_groups.map((group, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Group {index + 1} - Text Area
                        </label>
                        {meetingForm.deliverable_groups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeliverableGroup(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <textarea
                        value={group.notes_text}
                        onChange={(e) => updateDeliverableGroup(index, 'notes_text', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary mb-3"
                        rows={4}
                        placeholder={`Enter each deliverable on a new line, for example:

Review client proposals
Schedule follow-up meeting
Prepare project timeline`}
                      />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign All Lines in This Group To:
                        </label>
                        <select
                          value={group.assigned_to}
                          onChange={(e) => updateDeliverableGroup(index, 'assigned_to', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nestalk-primary"
                          required
                        >
                          <option value="">Select Staff Member...</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name} ({staff.username})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-nestalk-primary text-white rounded-md hover:bg-nestalk-primary/90"
                >
                  {editingMeetingNote ? 'Update' : 'Create'} Meeting Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}