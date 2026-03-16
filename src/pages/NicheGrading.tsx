import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Award, CheckCircle, AlertCircle, Star, Eye, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import NicheCertificate from '../components/NicheCertificate'
import html2pdf from 'html2pdf.js'

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
  const [allTrainees, setAllTrainees] = useState<NicheTrainee[]>([])
  const [filteredTrainees, setFilteredTrainees] = useState<NicheTrainee[]>([])
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
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedCohortForExport, setSelectedCohortForExport] = useState('all')
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [subPillarGrades, setSubPillarGrades] = useState<SubPillarGrades>({})
  const [hasChanges, setHasChanges] = useState(false)
  
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
    loadAllTrainees()
    loadGradedRecordsWithTraineeData()
  }, [])

  useEffect(() => {
    filterTrainees()
  }, [allTrainees, searchTerm, cohortFilter])

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

  const loadAllTrainees = async () => {
    try {
      const { data: traineesData, error: traineesError } = await supabase
        .from('niche_training')
        .select(`
          id, name, phone, role, status, course, cohort_id,
          niche_cohorts!inner(cohort_number)
        `)
        .eq('status', 'Graduated')
        .order('niche_cohorts(cohort_number)', { ascending: false })

      if (traineesError) throw traineesError

      // Check which trainees already have grades
      const { data: gradesData } = await supabase
        .from('trainee_grades')
        .select('trainee_id, training_type')

      const gradedTraineeMap = new Map(gradesData?.map(g => [g.trainee_id, g.training_type]) || [])

      const traineesWithGradeStatus = (traineesData || []).map(trainee => ({
        ...trainee,
        cohort_number: trainee.niche_cohorts?.cohort_number,
        has_grade: gradedTraineeMap.has(trainee.id),
        training_type: gradedTraineeMap.get(trainee.id)
      }))

      // Sort by cohort number descending (latest first), then by name
      traineesWithGradeStatus.sort((a, b) => {
        if (a.cohort_number !== b.cohort_number) {
          return (b.cohort_number || 0) - (a.cohort_number || 0)
        }
        return (a.name || '').localeCompare(b.name || '')
      })

      setAllTrainees(traineesWithGradeStatus)
    } catch (error) {
      console.error('Error loading all trainees:', error)
      showToast('Failed to load trainees', 'error')
    }
  }

  const filterTrainees = () => {
    let filtered = [...allTrainees]

    if (searchTerm) {
      filtered = filtered.filter(trainee => 
        trainee.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (cohortFilter !== 'all') {
      filtered = filtered.filter(trainee => trainee.cohort_id === cohortFilter)
    }

    // Maintain sorting by latest cohort first, then by name
    filtered.sort((a, b) => {
      if (a.cohort_number !== b.cohort_number) {
        return (b.cohort_number || 0) - (a.cohort_number || 0)
      }
      return (a.name || '').localeCompare(b.name || '')
    })

    setFilteredTrainees(filtered)
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
        cohort_id: trainee.cohort_id || '',
        training_type: trainingType,
        pillar1_score: 0,
        pillar2_score: 0,
        pillar3_score: 0,
        pillar4_score: 0,
        notes: ''
      })
      // Reset sub-pillar grades to default 3
      setSubPillarGrades({})
      setHasChanges(false)
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
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error loading existing grade:', error)
    }
  }

  const calculatePillarScores = () => {
    const pillars = gradeData.training_type === 'nanny' ? nannyPillars : houseManagerPillars
    
    // Calculate pillar averages from sub-pillars (1-5 scale)
    const pillarScores = pillars.map(pillar => {
      const subpillarValues = pillar.subpillars.map(sub => subPillarGrades[sub.key as keyof SubPillarGrades] || 3)
      const average = subpillarValues.reduce((sum, val) => sum + val, 0) / subpillarValues.length
      return average
    })
    
    // Convert to percentage (multiply by 20 to get 1-5 scale to 20-100 scale)
    const pillarPercentages = pillarScores.map(score => score * 20)
    
    // Apply weights to get weighted contributions (already in percentage form)
    const totalWeight = pillars.reduce((sum, pillar) => sum + pillar.weight, 0)
    const weightedScores = pillarPercentages.map((score, index) => {
      const weight = pillars[index].weight
      return (score * weight) / totalWeight
    })
    
    // Final score is sum of weighted contributions
    const finalScore = weightedScores.reduce((sum, score) => sum + score, 0)
    
    const tier = finalScore >= 95 ? 'MASTER' :
                 finalScore >= 90 ? 'DISTINGUISHED' :
                 finalScore >= 80 ? 'EXCEPTIONAL' :
                 finalScore >= 70 ? 'EXCELLENT' : 'NEEDS_IMPROVEMENT'
    
    return { pillarScores, weightedScores, finalScore, tier }
  }

  const updateSubPillarGrade = (key: string, value: number) => {
    setSubPillarGrades(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check permissions
    if (!staff || !['admin', 'trainer'].includes(staff.role?.toLowerCase())) {
      showToast('Only trainers and admins can grade trainees', 'error')
      return
    }

    // First, let's check what values exist in the database to understand the constraint
    try {
      const { data: existingGrades, error: checkError } = await supabase
        .from('trainee_grades')
        .select('pillar1_score, pillar2_score, pillar3_score, pillar4_score')
        .limit(5)
      
      if (!checkError && existingGrades) {
        console.log('Existing pillar scores in database:', existingGrades)
      }
    } catch (error) {
      console.log('Could not check existing grades:', error)
    }

    try {
      // Calculate final scores from sub-pillars
      const scores = calculatePillarScores()
      
      // Debug: Log the calculated scores
      console.log('Calculated scores:', {
        pillarScores: scores.pillarScores,
        weightedScores: scores.weightedScores,
        finalScore: scores.finalScore,
        tier: scores.tier
      })
      
      // Try using percentage scale (20-100) for pillar scores based on database constraint
      const pillar1 = Math.round(scores.pillarScores[0] * 20) // Convert 1-5 to 20-100
      const pillar2 = Math.round(scores.pillarScores[1] * 20)
      const pillar3 = Math.round(scores.pillarScores[2] * 20)
      const pillar4 = Math.round(scores.pillarScores[3] * 20)
      
      console.log('Pillar scores in percentage scale:', { pillar1, pillar2, pillar3, pillar4 })
      
      const payload = {
        trainee_id: gradeData.trainee_id,
        cohort_id: gradeData.cohort_id,
        training_type: gradeData.training_type,
        pillar1_score: pillar1,
        pillar2_score: pillar2,
        pillar3_score: pillar3,
        pillar4_score: pillar4,
        pillar1_weighted: scores.weightedScores[0] || 0,
        pillar2_weighted: scores.weightedScores[1] || 0,
        pillar3_weighted: scores.weightedScores[2] || 0, 
        pillar4_weighted: scores.weightedScores[3] || 0,
        final_score: scores.finalScore || 0,
        tier: scores.tier || 'NONE',
        notes: gradeData.notes,
        graded_by: staff.name || user?.email || 'Unknown'
      }
      
      // Debug: Log the payload being sent
      console.log('Full payload being sent to database:', JSON.stringify(payload, null, 2))

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
      loadAllTrainees() // Refresh trainee list
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

  const generatePreview = () => {
    // Filter records based on selected cohort
    let recordsToExport = gradedRecords
    if (selectedCohortForExport !== 'all') {
      recordsToExport = gradedRecords.filter(record => record.cohort_id === selectedCohortForExport)
    }

    // Get cohort info for title
    const selectedCohortInfo = selectedCohortForExport !== 'all' 
      ? cohorts.find(c => c.id === selectedCohortForExport)
      : null

    // Separate records by training type
    const nannyRecords = recordsToExport.filter(record => record.training_type === 'nanny')
    const houseManagerRecords = recordsToExport.filter(record => record.training_type === 'house_manager')

    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white;">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #AE491E; padding-bottom: 15px;">
          <h1 style="font-size: 24px; margin: 0; color: #AE491E; font-weight: bold;">Nestara Institute of Care and Hospitality Excellence</h1>
          <h2 style="font-size: 16px; margin: 8px 0 0 0; color: #666;">NICHE Professionals Report${selectedCohortInfo ? ` - Cohort ${getRomanNumeral(selectedCohortInfo.cohort_number)}` : ''}</h2>
          ${selectedCohortInfo ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${new Date(selectedCohortInfo.start_date).toLocaleDateString()} to ${new Date(selectedCohortInfo.end_date).toLocaleDateString()}</p>` : ''}
        </div>

        ${nannyRecords.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: bold; margin: 25px 0 15px 0; color: #AE491E; border-bottom: 2px solid #AE491E; padding-bottom: 8px;">
              Nanny Professionals (${nannyRecords.length})
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
              <thead>
                <tr style="background: linear-gradient(135deg, #AE491E, #8B3A18); color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">#</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px;">Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Childcare & Development</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Professional Conduct</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Housekeeping</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Cooking & Nutrition</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">Final Score</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">Tier</th>
                </tr>
              </thead>
              <tbody>
                ${nannyRecords.map((record, index) => `
                  <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-weight: 500;">${record.trainee_name}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar1_weighted?.toFixed(1)}/45</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar2_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar3_weighted?.toFixed(1)}/15</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar4_weighted?.toFixed(1)}/10</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: #AE491E;">${record.final_score?.toFixed(1)}%</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${record.tier === 'MASTER' ? '#7c3aed' : record.tier === 'DISTINGUISHED' ? '#2563eb' : record.tier === 'EXCEPTIONAL' ? '#059669' : '#d97706'};">${record.tier}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${houseManagerRecords.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: bold; margin: 25px 0 15px 0; color: #AE491E; border-bottom: 2px solid #AE491E; padding-bottom: 8px;">
              House Manager Professionals (${houseManagerRecords.length})
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
              <thead>
                <tr style="background: linear-gradient(135deg, #AE491E, #8B3A18); color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">#</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px;">Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Professional Conduct</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Housekeeping & Systems</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Cooking & Kitchen</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px;">Childcare Literacy</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">Final Score</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 10px;">Tier</th>
                </tr>
              </thead>
              <tbody>
                ${houseManagerRecords.map((record, index) => `
                  <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; font-weight: 500;">${record.trainee_name}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar1_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar2_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar3_weighted?.toFixed(1)}/25</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${record.pillar4_weighted?.toFixed(1)}/15</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: #AE491E;">${record.final_score?.toFixed(1)}%</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${record.tier === 'MASTER' ? '#7c3aed' : record.tier === 'DISTINGUISHED' ? '#2563eb' : record.tier === 'EXCEPTIONAL' ? '#059669' : '#d97706'};">${record.tier}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #AE491E; font-size: 14px;">Performance Tiers</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="padding: 2px 6px; border-radius: 12px; font-weight: bold; background: #f3e8ff; color: #7c3aed;">MASTER</span>
              <span>95+ points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="padding: 2px 6px; border-radius: 12px; font-weight: bold; background: #dbeafe; color: #2563eb;">DISTINGUISHED</span>
              <span>90-94 points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="padding: 2px 6px; border-radius: 12px; font-weight: bold; background: #d1fae5; color: #059669;">EXCEPTIONAL</span>
              <span>80-89 points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="padding: 2px 6px; border-radius: 12px; font-weight: bold; background: #fef3c7; color: #d97706;">EXCELLENT</span>
              <span>70-79 points</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px;">
          NICHE Academy | Total Professionals: ${recordsToExport.length}
        </div>
      </div>
    `

    setPreviewContent(content)
    setShowPreview(true)
  }

  const downloadPDF = () => {
    // Filter records based on selected cohort
    let recordsToExport = gradedRecords
    if (selectedCohortForExport !== 'all') {
      recordsToExport = gradedRecords.filter(record => record.cohort_id === selectedCohortForExport)
    }

    // Get cohort info for title
    const selectedCohortInfo = selectedCohortForExport !== 'all' 
      ? cohorts.find(c => c.id === selectedCohortForExport)
      : null

    // Separate records by training type
    const nannyRecords = recordsToExport.filter(record => record.training_type === 'nanny')
    const houseManagerRecords = recordsToExport.filter(record => record.training_type === 'house_manager')

    // Create a temporary element for PDF generation
    const element = document.createElement('div')
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: white;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #AE491E; padding-bottom: 20px;">
          <h1 style="font-size: 22px; margin: 0 0 10px 0; color: #AE491E; font-weight: bold;">Nestara Institute of Care and Hospitality Excellence</h1>
          <h2 style="font-size: 16px; margin: 0; color: #666;">NICHE Professionals Report${selectedCohortInfo ? ` - Cohort ${getRomanNumeral(selectedCohortInfo.cohort_number)}` : ''}</h2>
          ${selectedCohortInfo ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">${new Date(selectedCohortInfo.start_date).toLocaleDateString()} to ${new Date(selectedCohortInfo.end_date).toLocaleDateString()}</p>` : ''}
        </div>

        ${nannyRecords.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: bold; margin: 30px 0 15px 0; color: #AE491E; border-bottom: 2px solid #AE491E; padding-bottom: 8px;">
              Nanny Professionals (${nannyRecords.length})
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px;">
              <thead>
                <tr style="background: #AE491E; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">#</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Childcare & Development</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Professional Conduct</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Housekeeping</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Cooking & Nutrition</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Final Score</th>
                </tr>
              </thead>
              <tbody>
                ${nannyRecords.map((record, index) => `
                  <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${record.trainee_name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar1_weighted?.toFixed(1)}/45</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar2_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar3_weighted?.toFixed(1)}/15</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar4_weighted?.toFixed(1)}/10</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #AE491E;">${record.final_score?.toFixed(1)}% - ${record.tier}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${houseManagerRecords.length > 0 ? `
          <div style="margin-bottom: 30px; ${nannyRecords.length > 8 ? 'page-break-before: always;' : ''}">
            <h3 style="font-size: 16px; font-weight: bold; margin: 30px 0 15px 0; color: #AE491E; border-bottom: 2px solid #AE491E; padding-bottom: 8px;">
              House Manager Professionals (${houseManagerRecords.length})
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px;">
              <thead>
                <tr style="background: #AE491E; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">#</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Professional Conduct</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Housekeeping & Systems</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Cooking & Kitchen</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Childcare Literacy</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">Final Score</th>
                </tr>
              </thead>
              <tbody>
                ${houseManagerRecords.map((record, index) => `
                  <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${record.trainee_name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar1_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar2_weighted?.toFixed(1)}/30</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar3_weighted?.toFixed(1)}/25</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${record.pillar4_weighted?.toFixed(1)}/15</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #AE491E;">${record.final_score?.toFixed(1)}% - ${record.tier}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div style="margin-top: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
          <h4 style="margin: 0 0 12px 0; color: #AE491E; font-size: 14px;">Performance Tiers</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 9px; background: #f3e8ff; color: #7c3aed;">MASTER</span>
              <span>95+ points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 9px; background: #dbeafe; color: #2563eb;">DISTINGUISHED</span>
              <span>90-94 points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 9px; background: #d1fae5; color: #059669;">EXCEPTIONAL</span>
              <span>80-89 points</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 9px; background: #fef3c7; color: #d97706;">EXCELLENT</span>
              <span>70-79 points</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px;">
          NICHE Academy | Total Professionals: ${recordsToExport.length}
        </div>
      </div>
    `

    // Configure PDF options
    const opt = {
      margin: [15, 10, 15, 10],
      filename: `niche-professionals-report${selectedCohortInfo ? `-cohort-${selectedCohortInfo.cohort_number}` : ''}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    // Generate and download PDF
    html2pdf().set(opt).from(element).save().then(() => {
      const cohortName = selectedCohortInfo ? ` for Cohort ${getRomanNumeral(selectedCohortInfo.cohort_number)}` : ''
      showToast(`PDF downloaded successfully${cohortName}`, 'success')
      setShowPreview(false)
      setShowExportModal(false)
    }).catch((error) => {
      console.error('PDF generation error:', error)
      showToast('Failed to generate PDF', 'error')
    })
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
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Report
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

              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search trainees by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                  />
                  <select
                    value={cohortFilter}
                    onChange={(e) => setCohortFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-48"
                  >
                    <option value="all">All Cohorts</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.id} value={cohort.id}>
                        Cohort {getRomanNumeral(cohort.cohort_number)} - {cohort.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* All Trainees List */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  All Graduated Trainees
                </h2>
                
                {filteredTrainees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Cohort</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTrainees.map((trainee, index) => {
                          // Determine if this is a Nanny program based on course name
                          const isNannyProgram = trainee.course?.toLowerCase().includes('nanny') || 
                                               trainee.course?.toLowerCase().includes('childcare') ||
                                               trainee.course?.toLowerCase().includes('child care')
                          
                          return (
                            <tr key={trainee.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">{trainee.name}</div>
                                  {trainee.has_grade && (
                                    <CheckCircle className="w-4 h-4 ml-2 text-green-600" title="Already graded" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {trainee.cohort_number ? getRomanNumeral(trainee.cohort_number) : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                {!trainee.has_grade ? (
                                  isNannyProgram ? (
                                    <button
                                      onClick={() => handleGradeTrainee(trainee, 'nanny')}
                                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium"
                                    >
                                      Grade as Nanny
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleGradeTrainee(trainee, 'house_manager')}
                                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors font-medium"
                                    >
                                      Grade as House Manager
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleGradeTrainee(trainee, trainee.training_type || 'nanny')}
                                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg text-xs hover:bg-gray-700 transition-colors font-medium"
                                  >
                                    Edit Grade
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No graduated trainees found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || cohortFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No graduated trainees available for grading.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NICHE Professionals Tables */}
      {view === 'records' && (
        <div className="space-y-8 mt-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-3">
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

          {/* Nanny Professionals Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                  Nanny
                </span>
                NICHE Professionals
              </h2>
            </div>
            
            {filteredRecords.filter(record => record.training_type === 'nanny').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Childcare & Development</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Professional Conduct</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Housekeeping</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cooking & Nutrition</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.filter(record => record.training_type === 'nanny').map((record, index) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                          {index + 1}
                          <button
                            onClick={() => loadNicheCardData(record)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View Certificate"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.trainee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.trainee_course}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar1_weighted?.toFixed(1)}/45
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar2_weighted?.toFixed(1)}/30
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar3_weighted?.toFixed(1)}/15
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar4_weighted?.toFixed(1)}/10
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-nestalk-primary">
                          {record.final_score?.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(record.tier)}`}>
                            <Star className="w-3 h-3 mr-1" />
                            {record.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Nanny professionals found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || cohortFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No Nanny trainees have been graded yet.'}
                </p>
              </div>
            )}
          </div>

          {/* House Manager Professionals Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                  House Manager
                </span>
                NICHE Professionals
              </h2>
            </div>
            
            {filteredRecords.filter(record => record.training_type === 'house_manager').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Professional Conduct</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Housekeeping & Systems</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cooking & Kitchen</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Childcare Literacy</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.filter(record => record.training_type === 'house_manager').map((record, index) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                          {index + 1}
                          <button
                            onClick={() => loadNicheCardData(record)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View Certificate"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.trainee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.trainee_course}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar1_weighted?.toFixed(1)}/30
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar2_weighted?.toFixed(1)}/30
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar3_weighted?.toFixed(1)}/25
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                          {record.pillar4_weighted?.toFixed(1)}/15
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-nestalk-primary">
                          {record.final_score?.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(record.tier)}`}>
                            <Star className="w-3 h-3 mr-1" />
                            {record.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No House Manager professionals found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || cohortFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No House Manager trainees have been graded yet.'}
                </p>
              </div>
            )}
          </div>
          
          {/* Tier Legend */}
          <div className="bg-white rounded-lg shadow p-6">
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
                </div>
                <button
                  onClick={() => setShowGradingForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitGrade}>
                <div className="grid grid-cols-1 gap-6">
                  {/* Grading Table */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg border">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pillar / Sub-Pillar</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score (1-5)</th>
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
                                </tr>
                                {/* Sub-pillars */}
                                {pillar.subpillars.map((subpillar, subIndex) => (
                                  <tr key={subpillar.key} className="hover:bg-gray-50">
                                    <td className="px-8 py-2 text-sm text-gray-700">
                                      {subpillar.name}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <select
                                        value={subPillarGrades[subpillar.key as keyof SubPillarGrades] || ''}
                                        onChange={(e) => updateSubPillarGrade(subpillar.key, parseInt(e.target.value))}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                      >
                                        <option value="">-</option>
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                        <option value={4}>4</option>
                                        <option value={5}>5</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
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
                    disabled={!hasChanges}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      hasChanges 
                        ? 'bg-nestalk-primary text-white hover:bg-nestalk-primary/90' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
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

      {/* Export Modal */}
      {showExportModal && !showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Export NICHE Report</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Cohort Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Cohort
                  </label>
                  <select
                    value={selectedCohortForExport}
                    onChange={(e) => setSelectedCohortForExport(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-nestalk-primary"
                  >
                    <option value="all">All Cohorts</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.id} value={cohort.id}>
                        Cohort {getRomanNumeral(cohort.cohort_number)} - {cohort.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generatePreview}
                  className="flex-1 px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Report Preview</h2>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewContent('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            </div>
            
            <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewContent('')
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Selection
              </button>
              <button
                onClick={downloadPDF}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}