import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react'

interface TimetableEntry {
  id: string
  week_number: number
  day_of_week: string
  time_slot: string
  activity: string
  is_active: boolean
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Common time slots for the grid
const TIME_SLOTS = [
  '4:30am - 6:00am',
  '6:00am - 7:30am', 
  '7:30am - 8:00am',
  '8:00am - 10:00am',
  '10:00am - 10:30am',
  '10:30am - 1:00pm',
  '1:00pm - 2:00pm',
  '2:00pm - 3:00pm',
  '3:00pm - 5:00pm',
  '5:00pm - 6:30pm',
  '6:30pm - 7:30pm',
  '7:30pm - 9:00pm',
  '9:00pm'
]

export function NicheTimetable() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadTimetable()
  }, [])

  const loadTimetable = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_timetable')
        .select('id, week_number, day_of_week, time_slot, activity, is_active')
        .eq('is_active', true)
        .order('week_number')
        .order('day_of_week')
        .order('time_slot')

      if (error) throw error

      setTimetable(data || [])
      
      // Get unique weeks
      const weeks = [...new Set(data?.map(entry => entry.week_number) || [])].sort()
      setAvailableWeeks(weeks)
    } catch (error) {
      console.error('Error loading timetable:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredTimetable = () => {
    return timetable.filter(entry => entry.week_number === selectedWeek)
  }

  const getEntryForSlot = (day: string, timeSlot: string) => {
    const filtered = getFilteredTimetable()
    return filtered.find(entry => 
      entry.day_of_week === day && entry.time_slot === timeSlot
    )
  }

  const getCourseTypeColor = () => {
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot
      .replace(/:00/g, '')
      .replace(/ - /g, '-')
      .replace(/(\d+(?::\d+)?)am-(\d+(?::\d+)?)am/gi, '$1-$2AM')
      .replace(/(\d+(?::\d+)?)pm-(\d+(?::\d+)?)pm/gi, '$1-$2PM')
      .replace(/am|pm/gi, match => match.toUpperCase())
  }

  const getShortActivity = (activity: string) => {
    if (activity.length <= 30) return activity
    return activity.substring(0, 30) + '...'
  }

  const openModal = (entry: TimetableEntry) => {
    setSelectedEntry(entry)
    setShowModal(true)
  }

  const closeModal = () => {
    setSelectedEntry(null)
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-4 h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">NICHE Training Timetable</h1>
          <p className="text-gray-600">Weekly training schedule for domestic staff programs</p>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedWeek(1)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedWeek === 1
                ? 'bg-nestalk-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week 1
          </button>
          <button
            onClick={() => setSelectedWeek(2)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedWeek === 2
                ? 'bg-nestalk-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week 2
          </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-nestalk-primary text-white">
                <th className="sticky left-0 bg-nestalk-primary px-2 py-2 text-left text-xs font-semibold w-24 z-10">Time</th>
                {DAYS_ORDER.map(day => (
                  <th key={day} className="px-2 py-2 text-center text-xs font-semibold">
                    {day.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {TIME_SLOTS.map((timeSlot, timeIndex) => (
                <tr key={timeSlot} className={timeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="sticky left-0 px-2 py-1 text-xs font-medium text-gray-600 border-r border-gray-200 z-10 bg-inherit">
                    {formatTimeSlot(timeSlot)}
                  </td>
                  {DAYS_ORDER.map(day => {
                    const entry = getEntryForSlot(day, timeSlot)
                    return (
                      <td key={`${day}-${timeSlot}`} className="px-1 py-1 text-center">
                        {entry ? (
                          <button
                            onClick={() => openModal(entry)}
                            className={`w-full p-1 rounded border text-xs leading-tight hover:shadow-md transition-all cursor-pointer ${getCourseTypeColor()}`}
                            title="Click to view details"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate text-xs">{getShortActivity(entry.activity)}</span>
                              <Eye className="w-2 h-2 opacity-60" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-full p-1 text-gray-300 text-xs">-</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Activity Details</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Day</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedEntry.day_of_week}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Time</label>
                  <p className="text-lg font-semibold text-gray-900">{formatTimeSlot(selectedEntry.time_slot)}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Activity Description</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 leading-relaxed">{selectedEntry.activity}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}