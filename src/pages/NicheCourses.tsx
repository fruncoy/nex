import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

interface NicheCourse {
  id: string
  name: string
  description?: string
  duration_text?: string
  format?: string
  cost_kes?: number
  full_description?: string
  is_active: boolean
}

export function NicheCourses() {
  const [courses, setCourses] = useState<NicheCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_courses')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getShortPreview = (description: string) => {
    const firstSentence = description.split('.')[0]
    return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence + '.'
  }

  const toggleExpanded = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">NICHE Courses</h1>
        <p className="text-gray-600">Professional training programs for domestic staff</p>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {course.full_description ? getShortPreview(course.full_description) : 'No description available'}
                  </p>
                </div>
                <button
                  onClick={() => toggleExpanded(course.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-nestalk-primary transition-colors"
                >
                  {expandedCourse === course.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {course.duration_text && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{course.duration_text}</span>
                  </div>
                )}
                
                {course.format && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{course.format}</span>
                  </div>
                )}
                
                {course.cost_kes && (
                  <span className="font-semibold text-nestalk-primary">
                    {formatCurrency(course.cost_kes)}
                  </span>
                )}
              </div>

              {expandedCourse === course.id && course.full_description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {course.full_description.split('. ').map((sentence, index, array) => (
                      <p key={index} className={index < array.length - 1 ? 'mb-2' : ''}>
                        {sentence}{index < array.length - 1 ? '.' : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No courses available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Course information will appear here once courses are added to the system.
          </p>
        </div>
      )}
    </div>
  )
}