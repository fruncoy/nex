import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, MapPin, Edit2, Trash2, Plus, X } from 'lucide-react'

interface NicheCourse {
  id?: string
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
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'flagship' | 'specialized'>('flagship')
  const [editingCourse, setEditingCourse] = useState<NicheCourse | null>(null)
  const [formData, setFormData] = useState<Partial<NicheCourse>>({
    name: '',
    description: '',
    duration_weeks: 0,
    cost_kes: 0,
    course_type: 'specialized',
    is_active: true
  })

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

  const handleEdit = (course: NicheCourse) => {
    setEditingCourse(course)
    setFormData(course)
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingCourse(null)
    setFormData({
      name: '',
      description: '',
      duration_weeks: 0,
      cost_kes: 0,
      course_type: activeTab,
      is_active: true
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This will not affect existing student records.')) return

    try {
      const { error } = await supabase
        .from('niche_courses')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      loadCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCourse?.id) {
        const { error } = await supabase
          .from('niche_courses')
          .update(formData)
          .eq('id', editingCourse.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('niche_courses')
          .insert([formData])
        if (error) throw error
      }
      setShowModal(false)
      loadCourses()
    } catch (error) {
      console.error('Error saving course:', error)
      alert('Failed to save course')
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

  const renderTable = (coursesToRender: NicheCourse[]) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {activeTab === 'specialized' ? 'Duration (Hours)' : 'Duration'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coursesToRender.map((course, index) => (
              <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{course.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                    {activeTab === 'specialized' ? (
                      `${course.duration_weeks || 0} Hours`
                    ) : (
                      course.duration_weeks === 2 ? '14 days' : 
                      course.duration_weeks === 0.2 ? '1 Day' :
                      course.duration_weeks === 0.4 ? '2 Days' :
                      `${((course.duration_weeks || 0) * 7).toFixed(0)} Days`
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-nestalk-primary">
                    {formatCurrency(course.cost_kes || 0)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 max-w-xs truncate" title={course.description}>
                    {course.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(course)} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(course.id!)} 
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {coursesToRender.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                  No courses found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NICHE Courses</h1>
          <p className="text-gray-600">Professional training programs for domestic staff</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-nestalk-primary text-white px-4 py-2 rounded-lg hover:bg-nestalk-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Course
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('flagship')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'flagship' ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          2 Week Programs ({flagshipCourses.length})
        </button>
        <button
          onClick={() => setActiveTab('specialized')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'specialized' ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Specialized Skills ({specializedCourses.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'flagship' ? renderTable(flagshipCourses) : renderTable(specializedCourses)}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nestalk-primary outline-none"
                  placeholder="e.g., Home Baking & Pastry Foundations"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost (KES)</label>
                  <input
                    type="number"
                    required
                    value={formData.cost_kes}
                    onChange={e => setFormData({ ...formData, cost_kes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nestalk-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.course_type === 'specialized' ? 'Duration (Hours)' : 'Duration (Weeks)'}
                  </label>
                  <input
                    type="number"
                    step={formData.course_type === 'specialized' ? "1" : "0.1"}
                    required
                    value={formData.duration_weeks}
                    onChange={e => setFormData({ ...formData, duration_weeks: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nestalk-primary outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.course_type === 'specialized' ? 'Enter total training hours' : '1 day = 0.2, 14 days = 2.0'}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Type</label>
                <select
                  value={formData.course_type}
                  onChange={e => setFormData({ ...formData, course_type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nestalk-primary outline-none"
                >
                  <option value="specialized">Specialized Training</option>
                  <option value="flagship">Flagship Program</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nestalk-primary outline-none h-24 resize-none"
                  placeholder="Course details..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                >
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
