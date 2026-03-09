import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Award, CheckCircle, AlertCircle, Star, Eye, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import NicheCertificate from '../components/NicheCertificate'
import GradingReport from '../components/GradingReport'

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

interface SubPillarGrades {
  // House Manager sub-pillars
  authority_leadership?: number
  hm_communication?: number
  stress_management?: number
  discretion_confidentiality?: number
  decision_making?: number
  cleaning_standards?: number
  household_routines?: number
  organization_systems?: number
  housekeeping_appliances?: number
  laundry_ironing?: number
  kitchen_hygiene_safety?: number
  meal_planning?: number
  food_prep_presentation?: number
  storage_system?: number
  cleaning_maintenance?: number
  child_development_knowledge?: number
  routine_understanding?: number
  nanny_coordination?: number
  role_boundaries?: number
  safety_awareness?: number
  
  // Nanny sub-pillars
  child_hygiene_safety?: number
  routine_management?: number
  behavior_management?: number
  potty_training?: number
  first_aid?: number
  receives_correction?: number
  nanny_communication?: number
  emotional_control?: number
  boundaries_ethics?: number
  reliability?: number
  child_room_hygiene?: number
  toy_sanitation?: number
  bathroom_cleanliness?: number
  daily_reset?: number
  laundry_care?: number
  child_safe_food_prep?: number
  age_appropriate_meals?: number
  food_allergy_awareness?: number
  kitchen_hygiene_storage?: number
  family_food_prep?: number
}

interface GradeData {
  id?: string
  trainee_id: string
  cohort_id: string
  training_type: 'nanny' | 'house_manager'
  pillar1_score: number
  pillar2_score: number
  pillar3_score: number
  pillar4_score: number
  pillar1_weighted?: number
  pillar2_weighted?: number
  pillar3_weighted?: number
  pillar4_weighted?: number
  final_score?: number
  tier?: string
  notes?: string
}

export function NicheGrading() {
  const [cohorts, setCohorts] = useState<NicheCohort[]>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('')
  const [trainees, setTrainees] = useState<NicheTrainee[]>([])
  const [selectedTrainee, setSelectedTrainee] = useState<NicheTrainee | null>(null)
  const [showGradingForm, setShowGradingForm] = useState(false)
  const [gradedRecords, setGradedRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grade' | 'records'>('records')
  const [searchTerm, setSearchTerm] = useState('')
  const [cohortFilter, setCohortFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [nicheCardData, setNicheCardData] = useState<any>(null)
  const [showReport, setShowReport] = useState(false)
  const [subPillarGrades, setSubPillarGrades] = useState<SubPillarGrades>({})
  
  // Define pillar structures
  const nannyPillars = [
    {
      name: 'Childcare & Development',
      weight: 1.8,
      subpillars: [
        { key: 'child_hygiene_safety', name: 'Child Hygiene & Safety' },
        { key: 'routine_management', name: 'Routine Management' },
        { key: 'behavior_management', name: 'Behavior Management' },
        { key: 'potty_training', name: 'Potty Training' },
        { key: 'first_aid', name: 'First Aid' }
      ]
    },
    {
      name: 'Professional Conduct',
      weight: 1.2,
      subpillars: [
        { key: 'receives_correction', name: 'Receives Correction' },
        { key: 'nanny_communication', name: 'Communication' },
        { key: 'emotional_control', name: 'Emotional Control' },
        { key: 'boundaries_ethics', name: 'Boundaries & Ethics' },
        { key: 'reliability', name: 'Reliability' }
      ]
    },
    {
      name: 'Housekeeping',
      weight: 0.6,
      subpillars: [
        { key: 'child_room_hygiene', name: 'Child Room Hygiene' },
        { key: 'toy_sanitation', name: 'Toy Sanitation' },
        { key: 'bathroom_cleanliness', name: 'Bathroom Cleanliness' },
        { key: 'daily_reset', name: 'Daily Reset' },
        { key: 'laundry_care', name: 'Laundry Care' }
      ]
    },
    {
      name: 'Cooking & Nutrition',
      weight: 0.4,
      subpillars: [
        { key: 'child_safe_food_prep', name: 'Child Safe Food Prep' },
        { key: 'age_appropriate_meals', name: 'Age Appropriate Meals' },
        { key: 'food_allergy_awareness', name: 'Food Allergy Awareness' },
        { key: 'kitchen_hygiene_storage', name: 'Kitchen Hygiene & Storage' },
        { key: 'family_food_prep', name: 'Family Food Prep' }
      ]
    }
  ]

  const houseManagerPillars = [
    {
      name: 'Professional Conduct',
      weight: 1.2,
      subpillars: [
        { key: 'authority_leadership', name: 'Authority & Leadership' },
        { key: 'hm_communication', name: 'Communication' },
        { key: 'stress_management', name: 'Stress Management' },
        { key: 'discretion_confidentiality', name: 'Discretion & Confidentiality' },
        { key: 'decision_making', name: 'Decision Making' }
      ]
    },
    {
      name: 'Housekeeping & Systems',
      weight: 1.2,
      subpillars: [
        { key: 'cleaning_standards', name: 'Cleaning Standards' },
        { key: 'household_routines', name: 'Household Routines' },
        { key: 'organization_systems', name: 'Organization Systems' },
        { key: 'housekeeping_appliances', name: 'Housekeeping Appliances' },
        { key: 'laundry_ironing', name: 'Laundry & Ironing' }
      ]
    },
    {
      name: 'Cooking & Kitchen',
      weight: 1.0,
      subpillars: [
        { key: 'kitchen_hygiene_safety', name: 'Kitchen Hygiene & Safety' },
        { key: 'meal_planning', name: 'Meal Planning' },
        { key: 'food_prep_presentation', name: 'Food Prep & Presentation' },
        { key: 'storage_system', name: 'Storage System' },
        { key: 'cleaning_maintenance', name: 'Cleaning & Maintenance' }
      ]
    },
    {
      name: 'Childcare Literacy',
      weight: 0.6,
      subpillars: [
        { key: 'child_development_knowledge', name: 'Child Development Knowledge' },
        { key: 'routine_understanding', name: 'Routine Understanding' },
        { key: 'nanny_coordination', name: 'Nanny Coordination' },
        { key: 'role_boundaries', name: 'Role Boundaries' },
        { key: 'safety_awareness', name: 'Safety Awareness' }
      ]
    }
  ]

  const [gradeData, setGradeData] = useState<GradeData>({
    trainee_id: '',
    cohort_id: '',
    training_type: 'nanny',
    pillar1_score: 0,
    pillar2_score: 0,
    pillar3_score: 0,
    pillar4_score: 0,
    notes: ''
  })

  const { user, staff } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadCohorts()
    loadGradedRecordsWithTraineeData()
  }, [])

  useEffect(() => {
    if (selectedCohort) {
      loadTrainees()
    }
  }, [selectedCohort])

  useEffect(() => {
    filterAndSortRecords()
  }, [gradedRecords, searchTerm, cohortFilter, sortBy])

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

  const loadGradedRecordsWithTraineeData = async () => {
    try {
      const { data: grades, error: gradesError } = await supabase
        .from('trainee_grades')
        .select('*')
        .order('created_at', { ascending: false })

      if (gradesError) throw gradesError

      // Get trainee data for each grade
      const enrichedRecords = await Promise.all(
        (grades || []).map(async (grade) => {
          const { data: trainee } = await supabase
            .from('niche_training')
            .select('name, role, course')
            .eq('id', grade.trainee_id)
            .single()
          
          return {
            ...grade,
            trainee_name: trainee?.name || 'Unknown',
            trainee_role: trainee?.role || 'Unknown',
            trainee_course: trainee?.course || 'Unknown'
          }
        })
      )

      setGradedRecords(enrichedRecords)
    } catch (error) {
      console.error('Error loading graded records:', error)
      showToast('Failed to load graded records', 'error')
    }
  }

  const loadNicheCardData = async (record: any) => {
    try {
      const { data: trainee } = await supabase
        .from('niche_training')
        .select('*')
        .eq('id', record.trainee_id)
        .single()

      const { data: cohort } = await supabase
        .from('niche_cohorts')
        .select('*')
        .eq('id', record.cohort_id)
        .single()

      setNicheCardData({
        ...record,
        trainee: trainee || {},
        cohort: cohort || {}
      })
    } catch (error) {
      console.error('Error loading NICHE card data:', error)
    }
  }

  const filterAndSortRecords = () => {
    let filtered = [...gradedRecords]

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.trainee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (cohortFilter !== 'all') {
      filtered = filtered.filter(record => record.cohort_id === cohortFilter)
    }

    // Sort the filtered results
    if (sortBy === 'score') {
      filtered = filtered.sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
    } else {
      filtered = filtered.sort((a, b) => (a.trainee_name || '').localeCompare(b.trainee_name || ''))
    }

    setFilteredRecords(filtered)
  }

  const loadTrainees = async () => {
    try {
      const { data: traineesData, error: traineesError } = await supabase
        .from('niche_training')
        .select('id, name, phone, role, status, course')
        .eq('cohort_id', selectedCohort)
        .eq('status', 'Graduated')

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

  const handleGradeTrainee = (trainee: NicheTrainee, trainingType: 'nanny' | 'house_manager') => {
    setSelectedTrainee(trainee)
    
    if (trainee.has_grade) {
      // Load existing grade
      loadExistingGrade(trainee.id)
    } else {
      // Reset form for new grade - only set training type, scores calculated from sub-pillars
      setGradeData({
        trainee_id: trainee.id,
        cohort_id: selectedCohort,
        training_type: trainingType,
        pillar1_score: 0,
        pillar2_score: 0,
        pillar3_score: 0,
        pillar4_score: 0,
        notes: ''
      })
      // Reset sub-pillar grades to default 3
      setSubPillarGrades({})
    }
    
    setShowGradingForm(true)
  }

  const loadExistingGrade = async (traineeId: string) => {
    try {
      const { data, error } = await supabase
        .from('trainee_grades')
        .select('*')
        .eq('trainee_id', traineeId)
        .single()

      if (error) throw error
      if (data) {
        setGradeData(data)
        
        // Load existing sub-pillar grades
        const { data: subData, error: subError } = await supabase
          .from('niche_subpillar_grades')
          .select('*')
          .eq('grade_id', data.id)
          .single()
          
        if (subError) {
          console.error('Error loading sub-pillar grades:', subError)
        } else if (subData) {
          setSubPillarGrades(subData)
        }
      }
    } catch (error) {
      console.error('Error loading existing grade:', error)
    }
  }

  const calculatePillarScores = () => {
    const pillars = gradeData.training_type === 'nanny' ? nannyPillars : houseManagerPillars
    const pillarScores = pillars.map(pillar => {
      const subpillarValues = pillar.subpillars.map(sub => subPillarGrades[sub.key as keyof SubPillarGrades] || 3)
      const average = subpillarValues.reduce((sum, val) => sum + val, 0) / subpillarValues.length
      return average
    })
    
    const weightedScores = pillarScores.map((score, index) => score * pillars[index].weight)
    const finalScore = weightedScores.reduce((sum, score) => sum + score, 0)
    
    const tier = finalScore >= 95 ? 'MASTER' :
                 finalScore >= 90 ? 'DISTINGUISHED' :
                 finalScore >= 80 ? 'EXCEPTIONAL' :
                 finalScore >= 70 ? 'EXCELLENT' : 'NONE'
    
    return { pillarScores, weightedScores, finalScore, tier }
  }

  const updateSubPillarGrade = (key: string, value: number) => {
    setSubPillarGrades(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check permissions
    if (!staff || !['admin', 'trainer'].includes(staff.role?.toLowerCase())) {
      showToast('Only trainers and admins can grade trainees', 'error')
      return
    }

    try {
      // Calculate final scores from sub-pillars
      const scores = calculatePillarScores()
      
      const payload = {
        ...gradeData,
        pillar1_score: scores.pillarScores[0],
        pillar2_score: scores.pillarScores[1], 
        pillar3_score: scores.pillarScores[2],
        pillar4_score: scores.pillarScores[3],
        pillar1_weighted: scores.weightedScores[0],
        pillar2_weighted: scores.weightedScores[1],
        pillar3_weighted: scores.weightedScores[2], 
        pillar4_weighted: scores.weightedScores[3],
        final_score: scores.finalScore,
        tier: scores.tier,
        graded_by: staff.name || user?.email || 'Unknown'
      }

      if (gradeData.id) {
        // Update existing grade
        const { error } = await supabase
          .from('trainee_grades')
          .update(payload)
          .eq('id', gradeData.id)

        if (error) throw error
        
        // Update sub-pillar grades
        const { error: subError } = await supabase
          .from('niche_subpillar_grades')
          .update(subPillarGrades)
          .eq('grade_id', gradeData.id)
          
        if (subError) throw subError
        showToast('Grade updated successfully', 'success')
      } else {
        // Insert new grade
        const { data: gradeResult, error } = await supabase
          .from('trainee_grades')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error
        
        // Insert sub-pillar grades
        const { error: subError } = await supabase
          .from('niche_subpillar_grades')
          .insert({ ...subPillarGrades, grade_id: gradeResult.id })
          
        if (subError) throw subError
        showToast('Grade saved successfully', 'success')
      }

      setShowGradingForm(false)
      setSelectedTrainee(null)
      loadTrainees() // Refresh trainee list
      loadGradedRecordsWithTraineeData() // Refresh records table
    } catch (error: any) {
      console.error('Error saving grade:', error)
      showToast(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const getRomanNumeral = (num: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num] || num.toString()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'MASTER': return 'text-purple-600 bg-purple-100'
      case 'DISTINGUISHED': return 'text-blue-600 bg-blue-100'
      case 'EXCEPTIONAL': return 'text-green-600 bg-green-100'
      case 'EXCELLENT': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const liveScores = calculatePillarScores()

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NICHE Training Grading</h1>
            <p className="text-gray-600">Grade graduated trainees and view grading records</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReport(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Report
            </button>
            <button
              onClick={() => setView('grade')}
              className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              Grade Trainees
            </button>
          </div>
        </div>
      </div>

      {view === 'grade' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Grade Trainees</h2>
                <button
                  onClick={() => setView('records')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
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

              {/* Step 2: Display Graduated Trainees */}
              {selectedCohort && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Step 2: Select Graduated Trainee to Grade
                  </h2>
                  
                  {trainees.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {trainees.map((trainee, index) => (
                            <tr key={trainee.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">{trainee.name}</div>
                                  {trainee.has_grade && (
                                    <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trainee.role}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainee.phone || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {trainee.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {!trainee.has_grade ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleGradeTrainee(trainee, 'nanny')}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      Grade as Nanny
                                    </button>
                                    <button
                                      onClick={() => handleGradeTrainee(trainee, 'house_manager')}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                    >
                                      Grade as House Manager
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleGradeTrainee(trainee, 'nanny')}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                  >
                                    Edit Grade
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No graduated trainees found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No graduated trainees in this cohort available for grading.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NICHE Professionals Table */}
      {view === 'records' && (
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              NICHE Professionals
            </h2>
            
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
              />
              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Cohorts</option>
                {cohorts.map(cohort => (
                  <option key={cohort.id} value={cohort.id}>
                    Cohort {getRomanNumeral(cohort.cohort_number)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.trainee_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.trainee_role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.trainee_course}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(record.tier)}`}>
                          <Star className="w-3 h-3 mr-1" />
                          {record.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => loadNicheCardData(record)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No professionals found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || cohortFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No trainees have been graded yet.'}
              </p>
            </div>
          )}
          
          {/* Tier Legend */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Tiers</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-purple-600 bg-purple-100 mr-2">
                  <Star className="w-3 h-3 mr-1" />
                  MASTER
                </span>
                <span className="text-gray-600">95+ points</span>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100 mr-2">
                  <Star className="w-3 h-3 mr-1" />
                  DISTINGUISHED
                </span>
                <span className="text-gray-600">90-94 points</span>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100 mr-2">
                  <Star className="w-3 h-3 mr-1" />
                  EXCEPTIONAL
                </span>
                <span className="text-gray-600">80-89 points</span>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-100 mr-2">
                  <Star className="w-3 h-3 mr-1" />
                  EXCELLENT
                </span>
                <span className="text-gray-600">70-79 points</span>
              </div>
            </div>
          </div>
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
                    Grade: {selectedTrainee.name} - {gradeData.training_type === 'nanny' ? 'Nanny Training' : 'House Manager Training'}
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
                  {/* Grading Table */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg border">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {gradeData.training_type === 'nanny' ? 'Nanny Training' : 'House Manager Training'} - Sub-Pillar Grading
                        </h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pillar / Sub-Pillar</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score (1-5)</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pillar Avg</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Weighted</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(gradeData.training_type === 'nanny' ? nannyPillars : houseManagerPillars).map((pillar, pillarIndex) => (
                              <React.Fragment key={pillarIndex}>
                                {/* Pillar Header */}
                                <tr className="bg-blue-50">
                                  <td className="px-4 py-3 font-semibold text-blue-900" colSpan={2}>
                                    {pillar.name} (Weight: {pillar.weight}x)
                                  </td>
                                  <td className="px-4 py-3 text-center font-semibold text-blue-900">
                                    {liveScores.pillarScores[pillarIndex]?.toFixed(1) || '0.0'}
                                  </td>
                                  <td className="px-4 py-3 text-center font-semibold text-blue-900">
                                    {liveScores.weightedScores[pillarIndex]?.toFixed(1) || '0.0'}
                                  </td>
                                </tr>
                                {/* Sub-pillars */}
                                {pillar.subpillars.map((subpillar, subIndex) => (
                                  <tr key={subpillar.key} className="hover:bg-gray-50">
                                    <td className="px-8 py-2 text-sm text-gray-700">
                                      {subpillar.name}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <select
                                        value={subPillarGrades[subpillar.key as keyof SubPillarGrades] || 3}
                                        onChange={(e) => updateSubPillarGrade(subpillar.key, parseInt(e.target.value))}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                      >
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                        <option value={4}>4</option>
                                        <option value={5}>5</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-500">-</td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-500">-</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trainer Notes
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
                          <span className="text-sm text-gray-600">Pillar 1 Weighted:</span>
                          <span className="font-semibold">{liveScores.weightedScores[0]?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pillar 2 Weighted:</span>
                          <span className="font-semibold">{liveScores.weightedScores[1]?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pillar 3 Weighted:</span>
                          <span className="font-semibold">{liveScores.weightedScores[2]?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pillar 4 Weighted:</span>
                          <span className="font-semibold">{liveScores.weightedScores[3]?.toFixed(1) || '0.0'}</span>
                        </div>
                        
                        <hr className="my-3" />
                        
                        <div className="flex justify-between text-lg font-bold">
                          <span>Final Score:</span>
                          <span>{liveScores.finalScore?.toFixed(1) || '0.0'}/100</span>
                        </div>
                        
                        <div className="text-center">
                          <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getTierColor(liveScores.tier)}`}>
                            <Star className="w-4 h-4 mr-1" />
                            {liveScores.tier}
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

      {/* NICHE Professional Card Modal */}
      {nicheCardData && (
        <NicheCertificate
          recipientName={nicheCardData.trainee?.name || 'Unknown'}
          role={nicheCardData.trainee?.role || 'Unknown'}
          course={nicheCardData.trainee?.course || 'Unknown'}
          tier={nicheCardData.tier || 'NONE'}
          finalScore={nicheCardData.final_score || 0}
          cohortNumber={getRomanNumeral(nicheCardData.cohort?.cohort_number || 0)}
          graduationDate={new Date(nicheCardData.cohort?.end_date || Date.now()).toLocaleDateString()}
          pillar1Score={nicheCardData.pillar1_score || 0}
          pillar2Score={nicheCardData.pillar2_score || 0}
          pillar3Score={nicheCardData.pillar3_score || 0}
          pillar4Score={nicheCardData.pillar4_score || 0}
          pillar1Weighted={nicheCardData.pillar1_weighted || 0}
          pillar2Weighted={nicheCardData.pillar2_weighted || 0}
          pillar3Weighted={nicheCardData.pillar3_weighted || 0}
          pillar4Weighted={nicheCardData.pillar4_weighted || 0}
          trainingType={nicheCardData.training_type || 'nanny'}
          onClose={() => setNicheCardData(null)}
        />
      )}

      {/* Grading Report Modal */}
      {showReport && (
        <GradingReport onClose={() => setShowReport(false)} />
      )}

    </div>
  )
}