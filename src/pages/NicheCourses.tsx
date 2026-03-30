import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, MapPin } from 'lucide-react'

interface NicheCourse {
  id: string
  name: string
  description?: string
  duration_weeks?: number
  cost_kes?: number
  course_type?: 'flagship' | 'specialized'
  is_active: boolean
}

export function NicheCourses() {
  const [courses, setCourses] = useState<NicheCourse[]>([])
  const [loading, setLoading] = useState(true)

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

  const flagshipCourses = courses.filter(course => course.course_type === 'flagship')
  const specializedCourses = courses.filter(course => course.course_type === 'specialized')

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

      {/* Flagship Programs */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Flagship Training Programs (14 Days)</h2>
        <div className="space-y-4">
          {flagshipCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-nestalk-primary">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.name}</h3>
                <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Duration: 14 days</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>Format: In-Person/Boarding</span>
                  </div>
                  <span className="font-semibold text-nestalk-primary text-lg">
                    Cost: {formatCurrency(course.cost_kes || 0)}
                  </span>
                </div>
              </div>
              
              {course.description && (
                <div className="text-gray-700 leading-relaxed">
                  <p>{course.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Specialized Courses */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Specialized Skills Training</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specializedCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.name}</h3>
                <div className="flex flex-col gap-2 text-sm text-gray-600 mb-3">
                  {course.duration_weeks === 0.2 && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Duration: 1 Day</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>Format: In-Person</span>
                  </div>
                  <span className="font-semibold text-nestalk-primary">
                    Cost: {formatCurrency(course.cost_kes || 0)}{course.duration_weeks === 0 ? ' per session' : ''}
                  </span>
                </div>
              </div>
              
              {course.description && (
                <div className="text-gray-700 leading-relaxed text-sm">
                  <p>{course.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
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