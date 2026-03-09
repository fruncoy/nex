import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Award, CheckCircle, AlertCircle, Star, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface NicheCohort {
  id: string
  cohort_number: number
  start_date: string
  end_date: string
  status: string
}

interface NicheTrainee {
  id: string
  name: string
  phone?: string
  role?: string
  status: string
  course?: string
  has_grade?: boolean
}

interface GradeData {
  id?: string
  trainee_id: string
  cohort_id: string
  child_hygiene: number
  routine_management: number
  behavior_management: number
  potty_training: number
  first_aid: number
  communication: number
  time_management: number
  respectfulness: number
  responsibility: number
  attitude: number
  cleaning: number
  laundry: number
  organization: number
  dishwashing: number
  tidiness: number
  food_safety: number
  meal_preparation: number
  nutrition_awareness: number
  kitchen_hygiene: number
  efficiency: number
  childcare_score?: number
  conduct_score?: number
  housekeeping_score?: number
  cooking_score?: number
  total_score?: number
  grade_label?: string
  notes?: string
}

export function NicheGrading() {
  const [cohorts, setCohorts] = useState<NicheCohort[]>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('')
  const [trainees, setTrainees] = useState<NicheTrainee[]>([])
  const [selectedTrainee, setSelectedTrainee] = useState<NicheTrainee | null>(null)
  const [showGradingForm, setShowGradingForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gradeData, setGradeData] = useState<GradeData>({
    trainee_id: '',
    cohort_id: '',
    child_hygiene: 3,
    routine_management: 3,
    behavior_management: 3,
    potty_training: 3,
    first_aid: 3,
    communication: 3,
    time_management: 3,
    respectfulness: 3,
    responsibility: 3,
    attitude: 3,
    cleaning: 3,
    laundry: 3,
    organization: 3,
    dishwashing: 3,
    tidiness: 3,
    food_safety: 3,
    meal_preparation: 3,
    nutrition_awareness: 3,
    kitchen_hygiene: 3,
    efficiency: 3,
    notes: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadCohorts()
  }, [])

  useEffect(() => {
    if (selectedCohort) {
      loadTrainees()
    }
  }, [selectedCohort])

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_cohorts')
        .select('*')
        .in('status', ['active', 'completed', 'graduated'])
        .order('cohort_number', { ascending: false })

      if (error) throw error
      setCohorts(data || [])
    } catch (error) {
      console.error('Error loading cohorts:', error)
      showToast('Failed to load cohorts', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTrainees = async () => {
    try {
      const { data: traineesData, error: traineesError } = await supabase
        .from('niche_training')
        .select('id, name, phone, role, status, course')
        .eq('cohort_id', selectedCohort)
        .in('status', ['Active', 'Graduated'])

      if (traineesError) throw traineesError

      // Check which trainees already have grades
      const { data: gradesData } = await supabase
        .from('trainee_grades')
        .select('trainee_id')
        .eq('cohort_id', selectedCohort)

      const gradedTraineeIds = new Set(gradesData?.map(g => g.trainee_id) || [])

      const traineesWithGradeStatus = (traineesData || []).map(trainee => ({
        ...trainee,
        has_grade: gradedTraineeIds.has(trainee.id)
      }))

      setTrainees(traineesWithGradeStatus)
    } catch (error) {
      console.error('Error loading trainees:', error)
      showToast('Failed to load trainees', 'error')
    }
  }

  const handleGradeTrainee = async (trainee: NicheTrainee) => {
    setSelectedTrainee(trainee)
    
    if (trainee.has_grade) {
      // Load existing grade
      try {
        const { data, error } = await supabase
          .from('trainee_grades')
          .select('*')
          .eq('trainee_id', trainee.id)
          .single()

        if (error) throw error
        if (data) {
          setGradeData(data)
        }
      } catch (error) {
        console.error('Error loading existing grade:', error)
      }
    } else {
      // Reset form for new grade
      setGradeData({
        trainee_id: trainee.id,
        cohort_id: selectedCohort,
        child_hygiene: 3,
        routine_management: 3,
        behavior_management: 3,
        potty_training: 3,
        first_aid: 3,
        communication: 3,
        time_management: 3,
        respectfulness: 3,
        responsibility: 3,
        attitude: 3,
        cleaning: 3,
        laundry: 3,
        organization: 3,
        dishwashing: 3,
        tidiness: 3,
        food_safety: 3,
        meal_preparation: 3,
        nutrition_awareness: 3,
        kitchen_hygiene: 3,
        efficiency: 3,
        notes: ''
      })
    }
    
    setShowGradingForm(true)
  }

  const calculateLiveScores = () => {
    const childcareScore = ((gradeData.child_hygiene + gradeData.routine_management + 
      gradeData.behavior_management + gradeData.potty_training + gradeData.first_aid) / 5 / 5) * 45

    const conductScore = ((gradeData.communication + gradeData.time_management + 
      gradeData.respectfulness + gradeData.responsibility + gradeData.attitude) / 5 / 5) * 30

    const housekeepingScore = ((gradeData.cleaning + gradeData.laundry + 
      gradeData.organization + gradeData.dishwashing + gradeData.tidiness) / 5 / 5) * 15

    const cookingScore = ((gradeData.food_safety + gradeData.meal_preparation + 
      gradeData.nutrition_awareness + gradeData.kitchen_hygiene + gradeData.efficiency) / 5 / 5) * 10

    const totalScore = childcareScore + conductScore + housekeepingScore + cookingScore

    const gradeLabel = totalScore >= 90 ? 'Excellent' : 
                      totalScore >= 75 ? 'Good' : 
                      totalScore >= 60 ? 'Pass' : 'Fail'

    return { childcareScore, conductScore, housekeepingScore, cookingScore, totalScore, gradeLabel }
  }

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check permissions
    if (!staff || !['admin', 'trainer'].includes(staff.role?.toLowerCase())) {
      showToast('Only trainers and admins can grade trainees', 'error')
      return
    }

    try {
      const payload = {
        ...gradeData,
        graded_by: staff.name || user?.email || 'Unknown'
      }

      if (gradeData.id) {
        // Update existing grade
        const { error } = await supabase
          .from('trainee_grades')
          .update(payload)
          .eq('id', gradeData.id)

        if (error) throw error
        showToast('Grade updated successfully', 'success')
      } else {
        // Insert new grade
        const { error } = await supabase
          .from('trainee_grades')
          .insert(payload)

        if (error) throw error
        showToast('Grade saved successfully', 'success')
      }

      setShowGradingForm(false)
      setSelectedTrainee(null)
      loadTrainees() // Refresh trainee list
    } catch (error: any) {
      console.error('Error saving grade:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const getRomanNumeral = (num: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num] || num.toString()
  }

  const getGradeColor = (label: string) => {
    switch (label) {
      case 'Excellent': return 'text-green-600 bg-green-100'
      case 'Good': return 'text-blue-600 bg-blue-100'
      case 'Pass': return 'text-yellow-600 bg-yellow-100'
      case 'Fail': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const liveScores = calculateLiveScores()

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">NICHE Training Grading</h1>
        <p className="text-gray-600">Grade trainees at the end of their training program</p>
      </div>

      {/* Step 1: Select Cohort */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <GraduationCap className="w-5 h-5 mr-2" />
          Step 1: Select Cohort
        </h2>
        <select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
        >
          <option value="">Select a cohort to grade</option>
          {cohorts.map(cohort => (
            <option key={cohort.id} value={cohort.id}>
              Cohort {getRomanNumeral(cohort.cohort_number)} - {cohort.status} 
              ({new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Display Trainees */}
      {selectedCohort && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Step 2: Select Trainee to Grade
          </h2>
          
          {trainees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainees.map(trainee => (
                <div key={trainee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{trainee.name}</h3>
                      <p className="text-sm text-gray-600">{trainee.role}</p>
                      {trainee.phone && <p className="text-xs text-gray-500">{trainee.phone}</p>}
                    </div>
                    {trainee.has_grade && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-xs">Graded</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      trainee.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      trainee.status === 'Graduated' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trainee.status}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleGradeTrainee(trainee)}
                    className="w-full px-3 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors text-sm"
                  >
                    {trainee.has_grade ? 'Edit Grade' : 'Grade Trainee'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No trainees found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No active or graduated trainees in this cohort.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grading Form Modal */}
      {showGradingForm && selectedTrainee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Grade: {selectedTrainee.name}
                  </h2>
                  <p className="text-gray-600">{selectedTrainee.role} • {selectedTrainee.course}</p>
                </div>
                <button
                  onClick={() => setShowGradingForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitGrade}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Grading Sections */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Childcare - 45% */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">
                        Childcare (45%)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'child_hygiene', label: 'Child Hygiene' },
                          { key: 'routine_management', label: 'Routine Management' },
                          { key: 'behavior_management', label: 'Behavior Management' },
                          { key: 'potty_training', label: 'Potty Training' },
                          { key: 'first_aid', label: 'First Aid' }
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <select
                              value={gradeData[key as keyof GradeData] as number}
                              onChange={(e) => setGradeData({ ...gradeData, [key]: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              {[1, 2, 3, 4, 5].map(score => (
                                <option key={score} value={score}>{score}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Professional Conduct - 30% */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">
                        Professional Conduct (30%)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'communication', label: 'Communication' },
                          { key: 'time_management', label: 'Time Management' },
                          { key: 'respectfulness', label: 'Respectfulness' },
                          { key: 'responsibility', label: 'Responsibility' },
                          { key: 'attitude', label: 'Attitude' }
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <select
                              value={gradeData[key as keyof GradeData] as number}
                              onChange={(e) => setGradeData({ ...gradeData, [key]: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                              {[1, 2, 3, 4, 5].map(score => (
                                <option key={score} value={score}>{score}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Housekeeping - 15% */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">
                        Housekeeping (15%)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'cleaning', label: 'Cleaning' },
                          { key: 'laundry', label: 'Laundry' },
                          { key: 'organization', label: 'Organization' },
                          { key: 'dishwashing', label: 'Dishwashing' },
                          { key: 'tidiness', label: 'General Tidiness' }
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <select
                              value={gradeData[key as keyof GradeData] as number}
                              onChange={(e) => setGradeData({ ...gradeData, [key]: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              {[1, 2, 3, 4, 5].map(score => (
                                <option key={score} value={score}>{score}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cooking - 10% */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-900 mb-4">
                        Cooking (10%)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'food_safety', label: 'Food Safety' },
                          { key: 'meal_preparation', label: 'Meal Preparation' },
                          { key: 'nutrition_awareness', label: 'Nutrition Awareness' },
                          { key: 'kitchen_hygiene', label: 'Kitchen Hygiene' },
                          { key: 'efficiency', label: 'Efficiency' }
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <select
                              value={gradeData[key as keyof GradeData] as number}
                              onChange={(e) => setGradeData({ ...gradeData, [key]: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                              {[1, 2, 3, 4, 5].map(score => (
                                <option key={score} value={score}>{score}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        value={gradeData.notes || ''}
                        onChange={(e) => setGradeData({ ...gradeData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary"
                        placeholder="Optional notes about the trainee's performance..."
                      />
                    </div>
                  </div>

                  {/* Live Results Panel */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6 bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Award className="w-5 h-5 mr-2" />
                        Live Results
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Childcare Score:</span>
                          <span className="font-semibold">{liveScores.childcareScore.toFixed(1)}/45</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Conduct Score:</span>
                          <span className="font-semibold">{liveScores.conductScore.toFixed(1)}/30</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Housekeeping Score:</span>
                          <span className="font-semibold">{liveScores.housekeepingScore.toFixed(1)}/15</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Cooking Score:</span>
                          <span className="font-semibold">{liveScores.cookingScore.toFixed(1)}/10</span>
                        </div>
                        
                        <hr className="my-3" />
                        
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total Score:</span>
                          <span>{liveScores.totalScore.toFixed(1)}/100</span>
                        </div>
                        
                        <div className="text-center">
                          <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getGradeColor(liveScores.gradeLabel)}`}>
                            <Star className="w-4 h-4 mr-1" />
                            {liveScores.gradeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowGradingForm(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors"
                  >
                    {gradeData.id ? 'Update Grade' : 'Save Grade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}