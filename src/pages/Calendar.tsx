import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, ChevronLeft, ChevronRight, Settings, Download, X, Calendar as CalendarIcon, List, Edit } from 'lucide-react'
import html2canvas from 'html2canvas'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_date: string
  event_type: 'INTERNAL' | 'EXTERNAL'
}

export function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ internal: true, external: true })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL'
  })

  useEffect(() => {
    fetchEvents()
  }, [currentDate, dateRange])

  const fetchEvents = async () => {
    let startDate, endDate
    
    if (dateRange.start && dateRange.end) {
      startDate = dateRange.start
      endDate = dateRange.end
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      startDate = startOfMonth.toISOString().split('T')[0]
      endDate = endOfMonth.toISOString().split('T')[0]
    }
    
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date')
    
    setEvents(data || [])
  }

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) return
    
    await supabase.from('calendar_events').insert([newEvent])
    setNewEvent({ title: '', description: '', event_date: '', event_type: 'INTERNAL' })
    setShowModal(false)
    fetchEvents()
  }

  const updateEvent = async () => {
    if (!editingEvent) return
    
    await supabase.from('calendar_events')
      .update({
        title: editingEvent.title,
        description: editingEvent.description,
        event_date: editingEvent.event_date,
        event_type: editingEvent.event_type
      })
      .eq('id', editingEvent.id)
    
    setEditingEvent(null)
    fetchEvents()
  }

  const handleDayClick = (day: number | Date) => {
    let dateStr
    if (day instanceof Date) {
      dateStr = day.toISOString().split('T')[0]
    } else {
      dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    setSelectedDay(dateStr)
  }

  const getEventsGroupedByDate = () => {
    const grouped: { [key: string]: CalendarEvent[] } = {}
    events.forEach(event => {
      if (!grouped[event.event_date]) {
        grouped[event.event_date] = []
      }
      grouped[event.event_date].push(event)
    })
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }

  const getDaysInRange = () => {
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start)
      const end = new Date(dateRange.end)
      const days = []
      
      // Get first day of week for start date
      const startOfWeek = new Date(start)
      startOfWeek.setDate(start.getDate() - start.getDay())
      
      // Get last day of week for end date
      const endOfWeek = new Date(end)
      endOfWeek.setDate(end.getDate() + (6 - end.getDay()))
      
      const current = new Date(startOfWeek)
      while (current <= endOfWeek) {
        const isInRange = current >= start && current <= end
        days.push({
          date: new Date(current),
          day: current.getDate(),
          isInRange
        })
        current.setDate(current.getDate() + 1)
      }
      
      return days
    }
    
    // Default monthly view
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getEventsForDay = (day: number | Date) => {
    let dateStr
    if (day instanceof Date) {
      dateStr = day.toISOString().split('T')[0]
    } else {
      dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return events.filter(event => {
      if (event.event_date !== dateStr) return false
      if (event.event_type === 'INTERNAL' && !filters.internal) return false
      if (event.event_type === 'EXTERNAL' && !filters.external) return false
      return true
    })
  }

  const isToday = (day: number | Date) => {
    const today = new Date()
    if (day instanceof Date) {
      return today.toDateString() === day.toDateString()
    }
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear()
  }

  const downloadCalendar = async () => {
    if (!calendarRef.current) return
    const canvas = await html2canvas(calendarRef.current, { scale: 2 })
    const link = document.createElement('a')
    link.download = `calendar-${monthNames[currentDate.getMonth()]}-${currentDate.getFullYear()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const getFilteredEvents = () => {
    return events.filter(event => {
      if (event.event_type === 'INTERNAL' && !filters.internal) return false
      if (event.event_type === 'EXTERNAL' && !filters.external) return false
      return true
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDateRange = () => {
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start)
      const end = new Date(dateRange.end)
      const startMonth = monthNames[start.getMonth()].substring(0, 3)
      const endMonth = monthNames[end.getMonth()].substring(0, 3)
      return `${start.getDate()}${getOrdinal(start.getDate())} ${startMonth} - ${end.getDate()}${getOrdinal(end.getDate())} ${endMonth}`
    }
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const monthAbbr = monthNames[startOfMonth.getMonth()].substring(0, 3)
    
    return `${startOfMonth.getDate()}${getOrdinal(startOfMonth.getDate())} ${monthAbbr} - ${endOfMonth.getDate()}${getOrdinal(endOfMonth.getDate())} ${monthAbbr}`
  }

  const validateDateRange = (start: string, end: string) => {
    if (!start || !end) return true
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 31
  }

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showFilters && (
                <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg p-4 z-10 w-64">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Event Types</h4>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.internal}
                            onChange={(e) => setFilters({...filters, internal: e.target.checked})}
                            className="mr-2"
                          />
                          <span className="text-sm">Internal Events</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.external}
                            onChange={(e) => setFilters({...filters, external: e.target.checked})}
                            className="mr-2"
                          />
                          <span className="text-sm">External Events</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Date Range</h4>
                      <div className="space-y-2">
                        <input
                          type="date"
                          placeholder="Start Date"
                          value={dateRange.start}
                          onChange={(e) => {
                            const newRange = {...dateRange, start: e.target.value}
                            if (validateDateRange(newRange.start, newRange.end)) {
                              setDateRange(newRange)
                            }
                          }}
                          className="w-full p-2 border rounded text-xs"
                        />
                        <input
                          type="date"
                          placeholder="End Date"
                          value={dateRange.end}
                          min={dateRange.start}
                          max={dateRange.start ? new Date(new Date(dateRange.start).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const newRange = {...dateRange, end: e.target.value}
                            if (validateDateRange(newRange.start, newRange.end)) {
                              setDateRange(newRange)
                            }
                          }}
                          className="w-full p-2 border rounded text-xs"
                          disabled={!dateRange.start}
                        />
                        <div className="text-xs text-gray-500">Max 31 days range</div>
                        <button
                          onClick={() => setDateRange({ start: '', end: '' })}
                          className="w-full text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear Range
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="border-t border-gray-200 pt-2">
                        <button
                          onClick={downloadCalendar}
                          className="w-full border border-nestalk-primary text-nestalk-primary p-2 rounded text-sm hover:bg-nestalk-primary/10 flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download PNG</span>
                        </button>
                      </div>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="w-full bg-nestalk-primary text-white p-2 rounded text-sm hover:bg-nestalk-primary/90 flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Close</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-nestalk-primary text-white px-4 py-2 rounded-md hover:bg-nestalk-primary/90 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

      {viewMode === 'calendar' ? (
        <div ref={calendarRef} className="bg-white rounded-lg shadow">
        <div className="p-4 border-b rounded-t-lg" style={{ backgroundColor: '#ae491e' }}>
          <h1 className="text-2xl font-bold text-center text-white">Nestara Calendar</h1>
          <h2 className="text-sm italic text-white text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {getDateRange()}
          </h2>
        </div>
        <div className="grid grid-cols-7 gap-0 border-b">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-600 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
          
          <div className="grid grid-cols-7 gap-0">
            {getDaysInRange().map((dayObj, index) => {
              if (!dayObj) {
                return <div key={index} className="min-h-[120px] border-r border-b last:border-r-0 p-2"></div>
              }
              
              const day = typeof dayObj === 'number' ? dayObj : dayObj.day
              const dayDate = typeof dayObj === 'number' ? null : dayObj.date
              const isInRange = typeof dayObj === 'number' ? true : dayObj.isInRange
              
              const dayEvents = getEventsForDay(dayDate || day)
              const hasEvents = dayEvents.length > 0
              const primaryEvent = hasEvents ? dayEvents[0] : null
              const eventType = primaryEvent?.event_type
              
              return (
                <div 
                  key={index} 
                  className={`min-h-[120px] border-r border-b last:border-r-0 p-2 relative cursor-pointer ${
                    hasEvents ? 'text-white' : ''
                  }`} 
                  style={{
                    backgroundColor: hasEvents ? (eventType === 'EXTERNAL' ? '#ae491e' : '#0d410a') : 'white'
                  }}
                  onClick={() => handleDayClick(dayDate || day)}
                >
                  <div className={`font-semibold mb-1 flex items-center ${
                    hasEvents ? 'text-white' : 'text-gray-900'
                  }`}>
                    <span>{day}</span>
                    {isToday(dayDate || day) && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  {hasEvents && (
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div key={idx} className="text-white text-xs font-medium truncate">
                          {event.title === 'Office Closed' ? 'Office Closed' : event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-white text-xs opacity-75">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Event List</h3>
          <div className="space-y-4">
            {getEventsGroupedByDate().map(([date, dayEvents]) => (
              <div key={date} className="border-b pb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h4>
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: event.event_type === 'EXTERNAL' ? '#ae491e' : '#0d410a' }}
                          ></span>
                          <span className="font-medium">{event.title}</span>
                          <span className="text-xs px-2 py-1 rounded" style={{
                            backgroundColor: event.event_type === 'EXTERNAL' ? '#ae491e20' : '#0d410a20',
                            color: event.event_type === 'EXTERNAL' ? '#ae491e' : '#0d410a'
                          }}>
                            {event.event_type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-2 hover:bg-gray-200 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {getEventsGroupedByDate().length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No events found
              </div>
            )}
          </div>
        </div>
      )}

      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Event</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event Title"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="Description (optional)"
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                className="w-full p-2 border rounded h-20"
              />
              <input
                type="date"
                value={editingEvent.event_date}
                onChange={(e) => setEditingEvent({...editingEvent, event_date: e.target.value})}
                className="w-full p-2 border rounded"
              />
              <select
                value={editingEvent.event_type}
                onChange={(e) => setEditingEvent({...editingEvent, event_type: e.target.value as 'INTERNAL' | 'EXTERNAL'})}
                className="w-full p-2 border rounded"
              >
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">External</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={updateEvent}
                className="px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90"
              >
                Update Event
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="Description (optional)"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                className="w-full p-2 border rounded h-20"
              />
              <input
                type="date"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                className="w-full p-2 border rounded"
              />
              <select
                value={newEvent.event_type}
                onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value as 'INTERNAL' | 'EXTERNAL'})}
                className="w-full p-2 border rounded"
              >
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">External</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addEvent}
                className="px-4 py-2 bg-nestalk-primary text-white rounded hover:bg-nestalk-primary/90"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}