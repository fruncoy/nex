import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, GraduationCap, Award, CheckCircle, AlertCircle, Star, Eye, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import NicheCertificate from '../components/NicheCertificate'
import NicheTranscript from '../components/NicheTranscript'
import { formatDateWithOrdinal } from '../utils/dateFormat'
import { getOrCreateVerificationUrl } from '../utils/certificateToken'
import QRCode from 'qrcode'

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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [subPillarGrades, setSubPillarGrades] = useState<SubPillarGrades>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showViewChoice, setShowViewChoice] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [showCertificate, setShowCertificate] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [autoTranscriptDownload, setAutoTranscriptDownload] = useState(false)
  const [activeTab, setActiveTab] = useState<'flagship' | 'shortcourses'>('flagship')
  const [shortCourseTrainees, setShortCourseTrainees] = useState<any[]>([])
  const [filteredShortCourseTrainees, setFilteredShortCourseTrainees] = useState<any[]>([])
  const [selectedShortCourseTrainee, setSelectedShortCourseTrainee] = useState<any>(null)

  // Direct single-record download state
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null)
  const [downloadingTranscriptId, setDownloadingTranscriptId] = useState<string | null>(null)
  
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
    loadShortCourseTrainees()
  }, [])

  const loadShortCourseTrainees = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_training')
        .select('*')
        .eq('status', 'Completed')
        .order('created_at', { ascending: false })

      if (error) throw error
      setShortCourseTrainees(data || [])
    } catch (error) {
      console.error('Error loading short course trainees:', error)
      showToast('Failed to load short courses', 'error')
    }
  }

  useEffect(() => {
    let filtered = [...shortCourseTrainees]
    if (searchTerm) {
      filtered = filtered.filter(trainee => 
        trainee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainee.course?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    setFilteredShortCourseTrainees(filtered)
  }, [shortCourseTrainees, searchTerm])

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

      // Load sub-pillar scores
      const { data: subPillarData } = await supabase
        .from('niche_subpillar_grades')
        .select('*')
        .eq('grade_id', record.id)
        .single()

      setNicheCardData({
        ...record,
        trainee: trainee || {},
        cohort: cohort || {},
        subPillarScores: subPillarData || {}
      })
    } catch (error) {
      console.error('Error loading NICHE card data:', error)
    }
  }

  const handleViewChoice = async (record: any) => {
    setSelectedRecord(record)
    await loadNicheCardData(record)
    setShowViewChoice(true)
  }

  const handleViewCertificate = () => {
    setShowViewChoice(false)
    setShowCertificate(true)
  }

  const handleViewTranscript = () => {
    setShowViewChoice(false)
    setShowTranscript(true)
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

  // ── BULK CERTIFICATE DOWNLOAD ──────────────────────────────────────────────

  /**
   * Build a self-contained HTML string for a single certificate record.
   * Mirrors what NicheCertificate does inside downloadCertificate(),
   * but runs headlessly without a mounted DOM element.
   */
  const buildCertificateHTML = async (record: any): Promise<string> => {
    const isNanny = record.training_type === 'nanny'

    const nannyPillarDefs = [
      { name: 'Childcare & Development', maxWeighted: 45 },
      { name: 'Professional Conduct',    maxWeighted: 30 },
      { name: 'Housekeeping & Systems',  maxWeighted: 15 },
      { name: 'Cooking & Nutrition',     maxWeighted: 10 },
    ]
    const hmPillarDefs = [
      { name: 'Professional Conduct',      maxWeighted: 30 },
      { name: 'Housekeeping & Systems',    maxWeighted: 30 },
      { name: 'Cooking & Kitchen',         maxWeighted: 25 },
      { name: 'Childcare Literacy',        maxWeighted: 15 },
    ]
    const pillars = isNanny ? nannyPillarDefs : hmPillarDefs
    const weightedScores = [
      record.pillar1_weighted || 0,
      record.pillar2_weighted || 0,
      record.pillar3_weighted || 0,
      record.pillar4_weighted || 0,
    ]

    const recipientName  = record.trainee_name || 'Unknown'
    const course         = isNanny ? 'Nanny Training' : 'House Manager Training'
    const tier           = record.tier || ''
    const cohortNum      = getRomanNumeral(record.cohort?.cohort_number || 0)
    const graduationDate = record.cohort?.end_date
      ? formatDateWithOrdinal(new Date(record.cohort.end_date))
      : formatDateWithOrdinal(new Date())

    // Generate QR code as data-URL
    let qrDataUrl = ''
    try {
      const verifyUrl = await getOrCreateVerificationUrl(
        record.id,
        record.certificate_token,
        'trainee_grades'
      )
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 130,
        margin: 1,
        color: { dark: '#d95637', light: '#fff9f7' },
      })
    } catch (err) {
      console.warn('QR generation failed for', recipientName, err)
    }

    const scoreBarHTML = pillars.map((pillar, i) => {
      const score = weightedScores[i]
      return `
        <div style="position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;width:100%;padding:10px 8px 10px;overflow:hidden;height:75px;box-sizing:border-box;">
          <span style="position:absolute;bottom:0;left:0;right:0;font-size:46px;font-weight:800;color:rgba(217,86,55,0.25);line-height:1;pointer-events:none;user-select:none;letter-spacing:-1px;z-index:0;white-space:nowrap;overflow:hidden;text-align:center;font-family:'Playfair Display',serif;">
            ${score.toFixed(0)}<span style="font-size:0.5em">/${pillar.maxWeighted}</span>
          </span>
          <span style="position:relative;z-index:1;font-size:10.5px;font-weight:600;color:#000;white-space:nowrap;line-height:1.2;text-align:center;width:100%;font-family:'Poppins',sans-serif;">
            ${pillar.name}
          </span>
        </div>`
    }).join('')

    const qrHTML = qrDataUrl ? `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 8px 5px;border:1px solid #d95637;border-radius:6px;background:#fdf3f0;flex-shrink:0;margin-bottom:-18px;">
        <img src="${qrDataUrl}" width="52" height="52" alt="Verify certificate" style="display:block;" />
        <span style="font-family:'Poppins',sans-serif;font-size:5.5px;font-weight:600;color:#000;letter-spacing:0.1em;text-transform:uppercase;">Scan to Verify</span>
      </div>` : ''

    const descriptionText = `
      In recognition of her exceptional dedication and outstanding achievement within the
      <span style="font-family:'Cinzel',serif;color:#d95637;font-weight:700;letter-spacing:0.08em;">${course}</span>.
      ${recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, exhibiting a level
      of competency that transcends standard expectations and earns her the rank of
      <span style="font-family:'Cinzel',serif;color:#d95637;font-weight:700;letter-spacing:0.08em;">${tier}</span>`

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NICHE Certificate - ${recipientName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 0; }
    body { margin:0; padding:0; background:#FAF9F6; width:297mm; height:210mm; display:flex; justify-content:center; align-items:center; overflow:hidden; }
    * { page-break-after:avoid!important; page-break-before:avoid!important; page-break-inside:avoid!important; }
  </style>
</head>
<body>
  <div style="position:relative;width:297mm;height:210mm;background:#FAF9F6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3%;padding:6% 8%;box-sizing:border-box;overflow:hidden;">

    <!-- Border SVG -->
    <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;" viewBox="0 0 1414 1000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 65,30 L 1349,30 Q 1349,65 1384,65 L 1384,935 Q 1349,935 1349,970 L 65,970 Q 65,935 30,935 L 30,65 Q 65,65 65,30 Z" stroke="#d95637" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M 78,43 L 1336,43 Q 1336,78 1371,78 L 1371,922 Q 1336,922 1336,957 L 78,957 Q 78,922 43,922 L 43,78 Q 78,78 78,43 Z" stroke="#d95637" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>

    <!-- Header -->
    <div style="text-align:center;z-index:10;width:100%;margin-bottom:20px;">
      <h1 style="font-family:'Cinzel',serif;font-size:48px;color:#000;font-weight:700;letter-spacing:0.1em;margin-bottom:12px;line-height:1.1;">CERTIFICATE OF MERIT</h1>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;">
        <div style="height:1px;width:100px;background:#d95637;"></div>
        <p style="font-family:'Poppins',sans-serif;font-size:11px;letter-spacing:0.2em;color:#000;text-transform:uppercase;white-space:nowrap;">Nestara Institute of Care and Hospitality Excellence</p>
        <div style="height:1px;width:100px;background:#d95637;"></div>
      </div>
    </div>

    <!-- Recipient -->
    <div style="text-align:center;z-index:10;width:100%;max-width:800px;margin-bottom:20px;">
      <p style="font-family:'Playfair Display',serif;font-style:italic;font-size:17px;color:#000;margin-bottom:4px;">This honor is proudly bestowed upon</p>
      <h2 style="font-family:'Playfair Display',serif;font-weight:700;font-size:48px;color:#000;margin-bottom:12px;letter-spacing:0.02em;line-height:1.1;">${recipientName}</h2>
      <p style="font-family:'Poppins',sans-serif;font-size:13px;color:#000;line-height:1.6;max-width:650px;margin:0 auto;">${descriptionText}</p>
    </div>

    <!-- Scores + Signatures -->
    <div style="width:100%;max-width:780px;z-index:10;">
      <div style="margin-bottom:24px;">
        <h3 style="font-family:'Cinzel',serif;text-align:center;font-size:13px;font-weight:700;color:#000;letter-spacing:0.15em;margin-bottom:0;">Professional Competency Pillars</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0 8px;align-items:stretch;">
          ${scoreBarHTML}
        </div>
      </div>

      <!-- Signatures -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 40px;">
        <div style="width:200px;text-align:center;">
          <div style="position:relative;height:52px;margin-bottom:8px;">
            <img src="data:image/png;base64,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" alt="Nestara Limited Signature" style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);height:48px;width:auto;object-fit:contain;filter:invert(27%) sepia(100%) saturate(700%) hue-rotate(190deg) brightness(90%);"/>
            <div style="position:absolute;bottom:0;left:0;right:0;border-bottom:2px solid #000;"></div>
          </div>
          <span style="font-family:'Poppins',sans-serif;font-size:12px;color:#000;font-weight:500;display:block;white-space:nowrap;">Nestara Limited</span>
        </div>
        ${qrHTML}
        <div style="width:200px;text-align:center;">
          <div style="position:relative;height:52px;margin-bottom:8px;">
            <img src="data:image/png;base64,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" alt="Lead Trainer Signature" style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);height:48px;width:auto;object-fit:contain;filter:invert(27%) sepia(100%) saturate(700%) hue-rotate(190deg) brightness(90%);"/>
            <div style="position:absolute;bottom:0;left:0;right:0;border-bottom:2px solid #000;"></div>
          </div>
          <span style="font-family:'Poppins',sans-serif;font-size:12px;color:#000;font-weight:500;display:block;white-space:nowrap;">Lead Trainer, NICHE</span>
        </div>
      </div>
    </div>

  </div>
</body>
</html>`
  }

  // ── SINGLE CERTIFICATE / TRANSCRIPT DOWNLOAD ───────────────────────────────

  const downloadSingleCertificate = async (record: any) => {
    setDownloadingCertId(record.id)
    try {
      let fullRecord = record
      if (!record.cohort?.cohort_number) {
        const { data: cohort } = await supabase
          .from('niche_cohorts').select('*').eq('id', record.cohort_id).single()
        fullRecord = { ...record, cohort: cohort || {} }
      }
      const html = await buildCertificateHTML(fullRecord)
      const name = record.trainee_name || 'Unknown'
      const isLocal = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('192.168') ||
        window.location.port !== ''
      const apiEndpoint = isLocal ? 'http://localhost:3001/generate-pdf' : '/api/generate-pdf'
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          filename: `${name.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`,
          options: {
            format: 'A4', landscape: true, printBackground: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
            preferCSSPageSize: true, width: '297mm', height: '210mm', scale: 1.0,
          },
        }),
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Certificate downloaded for ${name}`, 'success')
    } catch (err: any) {
      showToast(`Certificate download failed: ${err.message}`, 'error')
    } finally {
      setDownloadingCertId(null)
    }
  }

  const downloadSingleTranscript = async (record: any) => {
    // Open the transcript preview modal so download uses the actual preview design
    await handleViewChoice(record)
    setShowViewChoice(false)
    setAutoTranscriptDownload(true)
    setShowTranscript(true)
  }

  // ── END SINGLE DOWNLOAD ─────────────────────────────────────────────────────

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

  const downloadPDF = async () => {
    setIsDownloadingPDF(true)
    try {
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

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Professionals Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              color: #333; 
              background: white;
              margin: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #AE491E;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 22px;
              margin: 0 0 10px 0;
              color: #AE491E;
              font-weight: bold;
            }
            .header h2 {
              font-size: 16px;
              margin: 0;
              color: #666;
            }
            .header p {
              margin: 8px 0 0 0;
              font-size: 12px;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h3 {
              font-size: 16px;
              font-weight: bold;
              margin: 30px 0 15px 0;
              color: #AE491E;
              border-bottom: 2px solid #AE491E;
              padding-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 10px;
            }
            th {
              background: #AE491E;
              color: white;
              border: 1px solid #ddd;
              padding: 8px;
              text-align: center;
              font-weight: bold;
            }
            th.left { text-align: left; }
            td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: center;
            }
            td.left { text-align: left; font-weight: 500; }
            td.score { font-weight: bold; }
            td.final { font-weight: bold; color: #AE491E; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .legend {
              margin-top: 25px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            .legend h4 {
              margin: 0 0 12px 0;
              color: #AE491E;
              font-size: 14px;
            }
            .legend-items {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              font-size: 10px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .legend-badge {
              padding: 3px 8px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 9px;
            }
            .master { background: #f3e8ff; color: #7c3aed; }
            .distinguished { background: #dbeafe; color: #2563eb; }
            .exceptional { background: #d1fae5; color: #059669; }
            .excellent { background: #fef3c7; color: #d97706; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Nestara Institute of Care and Hospitality Excellence</h1>
            <h2>NICHE Professionals Report${selectedCohortInfo ? ` - Cohort ${getRomanNumeral(selectedCohortInfo.cohort_number)}` : ''}</h2>
            ${selectedCohortInfo ? `<p>${new Date(selectedCohortInfo.start_date).toLocaleDateString()} to ${new Date(selectedCohortInfo.end_date).toLocaleDateString()}</p>` : ''}
          </div>

          ${nannyRecords.length > 0 ? `
            <div class="section">
              <h3>Nanny Professionals (${nannyRecords.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th class="left">Name</th>
                    <th>Childcare & Development</th>
                    <th>Professional Conduct</th>
                    <th>Housekeeping</th>
                    <th>Cooking & Nutrition</th>
                    <th>Final Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${nannyRecords.map((record, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td class="left">${record.trainee_name}</td>
                      <td class="score">${record.pillar1_weighted?.toFixed(1)}/45</td>
                      <td class="score">${record.pillar2_weighted?.toFixed(1)}/30</td>
                      <td class="score">${record.pillar3_weighted?.toFixed(1)}/15</td>
                      <td class="score">${record.pillar4_weighted?.toFixed(1)}/10</td>
                      <td class="final">${record.final_score?.toFixed(1)}% - ${record.tier}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${houseManagerRecords.length > 0 ? `
            <div class="section ${nannyRecords.length > 8 ? 'page-break' : ''}">
              <h3>House Manager Professionals (${houseManagerRecords.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th class="left">Name</th>
                    <th>Professional Conduct</th>
                    <th>Housekeeping & Systems</th>
                    <th>Cooking & Kitchen</th>
                    <th>Childcare Literacy</th>
                    <th>Final Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${houseManagerRecords.map((record, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td class="left">${record.trainee_name}</td>
                      <td class="score">${record.pillar1_weighted?.toFixed(1)}/30</td>
                      <td class="score">${record.pillar2_weighted?.toFixed(1)}/30</td>
                      <td class="score">${record.pillar3_weighted?.toFixed(1)}/25</td>
                      <td class="score">${record.pillar4_weighted?.toFixed(1)}/15</td>
                      <td class="final">${record.final_score?.toFixed(1)}% - ${record.tier}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="legend">
            <h4>Performance Tiers</h4>
            <div class="legend-items">
              <div class="legend-item">
                <span class="legend-badge master">MASTER</span>
                <span>95+ points</span>
              </div>
              <div class="legend-item">
                <span class="legend-badge distinguished">DISTINGUISHED</span>
                <span>90-94 points</span>
              </div>
              <div class="legend-item">
                <span class="legend-badge exceptional">EXCEPTIONAL</span>
                <span>80-89 points</span>
              </div>
              <div class="legend-item">
                <span class="legend-badge excellent">EXCELLENT</span>
                <span>70-79 points</span>
              </div>
            </div>
          </div>

          <div class="footer">
            NICHE Academy | Total Professionals: ${recordsToExport.length}
          </div>
        </body>
        </html>
      `

      // Check if running locally
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('192.168') ||
                     window.location.port !== ''
      
      const apiEndpoint = isLocal ? 'http://localhost:3001/generate-pdf' : '/api/generate-pdf'

      // Send to PDF service
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          filename: `niche-professionals-report${selectedCohortInfo ? `-cohort-${selectedCohortInfo.cohort_number}` : ''}-${new Date().toISOString().split('T')[0]}.pdf`,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' }
          }
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `niche-professionals-report${selectedCohortInfo ? `-cohort-${selectedCohortInfo.cohort_number}` : ''}-${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        
        const cohortName = selectedCohortInfo ? ` for Cohort ${getRomanNumeral(selectedCohortInfo.cohort_number)}` : ''
        showToast(`PDF downloaded successfully${cohortName}`, 'success')
        setShowPreview(false)
        setShowExportModal(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || 'PDF generation failed')
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      showToast(`PDF generation failed: ${error.message}. Make sure the PDF service is running on localhost:3001`, 'error')
    } finally {
      setIsDownloadingPDF(false)
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
                        Cohort {getRomanNumeral(cohort.cohort_number)} - {cohort.status} — {formatDateWithOrdinal(cohort.start_date)} to {formatDateWithOrdinal(cohort.end_date)}
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
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('flagship')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'flagship' ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Flagship Programs
            </button>
            <button
              onClick={() => setActiveTab('shortcourses')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'shortcourses' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Short Courses
            </button>
          </div>

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
              {activeTab === 'flagship' && (
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All Cohorts</option>
                  {cohorts.map(cohort => (
                    <option key={cohort.id} value={cohort.id}>
                      Cohort {getRomanNumeral(cohort.cohort_number)} — {formatDateWithOrdinal(cohort.start_date)} to {formatDateWithOrdinal(cohort.end_date)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Flagship Programs Section */}
          {activeTab === 'flagship' && (
            <>
              {/* Combined Professionals Table */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">NICHE Professionals</h2>
                  </div>
                </div>

                {filteredRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar 1</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar 2</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar 3</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pillar 4</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map((record, index) => {
                          const isNanny = record.training_type === 'nanny'
                          const p1Max = isNanny ? 45 : 30
                          const p2Max = isNanny ? 30 : 30
                          const p3Max = isNanny ? 15 : 25
                          const p4Max = isNanny ? 10 : 15
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-center">
                                <div className="flex items-center gap-1">
                                  <span>{index + 1}</span>
                                  <button
                                    onClick={() => handleViewChoice(record)}
                                    className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50"
                                    title="Preview Certificate or Transcript"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => downloadSingleCertificate(record)}
                                    disabled={downloadingCertId === record.id}
                                    className="w-6 h-6 rounded-full bg-[#d95637] hover:bg-[#b8442a] text-white flex items-center justify-center disabled:opacity-40 text-xs font-bold"
                                    title="Download Certificate"
                                  >
                                    {downloadingCertId === record.id
                                      ? <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                      : <span>C</span>
                                    }
                                  </button>
                                  <button
                                    onClick={() => downloadSingleTranscript(record)}
                                    disabled={downloadingTranscriptId === record.id}
                                    className="w-6 h-6 rounded-full bg-green-600 hover:bg-green-800 text-white flex items-center justify-center disabled:opacity-40 text-xs font-bold"
                                    title="Download Transcript"
                                  >
                                    {downloadingTranscriptId === record.id
                                      ? <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                      : <span>T</span>
                                    }
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.trainee_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isNanny ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {isNanny ? 'Nanny' : 'House Manager'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700">{record.pillar1_weighted?.toFixed(1)}/{p1Max}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700">{record.pillar2_weighted?.toFixed(1)}/{p2Max}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700">{record.pillar3_weighted?.toFixed(1)}/{p3Max}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700">{record.pillar4_weighted?.toFixed(1)}/{p4Max}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-nestalk-primary">{record.final_score?.toFixed(1)}%</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(record.tier)}`}>
                                  <Star className="w-3 h-3 mr-1" />
                                  {record.tier}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-sm font-medium text-gray-900">No graded professionals found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || cohortFilter !== 'all' ? 'Try adjusting your search or filter.' : 'No trainees have been graded yet.'}
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
            </>
          )}

          {/* Short Courses Section */}
          {activeTab === 'shortcourses' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Completed Short Courses</h2>
              </div>

              {filteredShortCourseTrainees.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Completed</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredShortCourseTrainees.map((trainee, index) => (
                        <tr key={trainee.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-center">{index + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{trainee.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700">{trainee.course || 'Short Course'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {trainee.date_completed ? new Date(trainee.date_completed).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => {
                                console.log('Opening short course certificate for:', trainee);
                                setNicheCardData(null);
                                setSelectedShortCourseTrainee(trainee)
                                setShowCertificate(true)
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition-colors font-medium"
                            >
                              <Award className="w-3.5 h-3.5" />
                              View Certificate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-sm font-medium text-gray-900">No completed short courses found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search.' : 'No trainees have completed short courses yet.'}
                  </p>
                </div>
              )}
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

      {/* View Choice Modal */}
      {showViewChoice && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Choose View</h2>
                <button
                  onClick={() => setShowViewChoice(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                What would you like to view for <strong>{selectedRecord.trainee_name}</strong>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleViewCertificate}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Award className="w-5 h-5" />
                  Certificate
                </button>
                <button
                  onClick={handleViewTranscript}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Official Transcript
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && (
        selectedShortCourseTrainee ? (
          <NicheCertificate
            recipientName={selectedShortCourseTrainee.name || 'Unknown'}
            course={selectedShortCourseTrainee.course || 'Short Course'}
            description={selectedShortCourseTrainee.description}
            dateStarted={selectedShortCourseTrainee.date_started}
            dateCompleted={selectedShortCourseTrainee.date_completed}
            graduationDate={selectedShortCourseTrainee.date_completed 
              ? formatDateWithOrdinal(selectedShortCourseTrainee.date_completed) 
              : formatDateWithOrdinal(new Date())}
            gradeId={selectedShortCourseTrainee.id}
            certificateToken={selectedShortCourseTrainee.certificate_token}
            tokenTable="niche_training"
            onClose={() => {
              setShowCertificate(false)
              setSelectedShortCourseTrainee(null)
            }}
          />
        ) : nicheCardData ? (
          <NicheCertificate
            recipientName={nicheCardData.trainee?.name || 'Unknown'}
            role={nicheCardData.trainee?.role || 'Unknown'}
            course={nicheCardData.trainee?.course || 'Unknown'}
            tier={nicheCardData.tier || 'NONE'}
            finalScore={nicheCardData.final_score || 0}
            cohortNumber={getRomanNumeral(nicheCardData.cohort?.cohort_number || 0)}
            graduationDate={formatDateWithOrdinal(new Date(nicheCardData.cohort?.end_date || Date.now()))}
            pillar1Score={nicheCardData.pillar1_score || 0}
            pillar2Score={nicheCardData.pillar2_score || 0}
            pillar3Score={nicheCardData.pillar3_score || 0}
            pillar4Score={nicheCardData.pillar4_score || 0}
            pillar1Weighted={nicheCardData.pillar1_weighted || 0}
            pillar2Weighted={nicheCardData.pillar2_weighted || 0}
            pillar3Weighted={nicheCardData.pillar3_weighted || 0}
            pillar4Weighted={nicheCardData.pillar4_weighted || 0}
            trainingType={nicheCardData.training_type || 'nanny'}
            gradeId={nicheCardData.id}
            certificateToken={nicheCardData.certificate_token}
            onClose={() => {
              setShowCertificate(false)
              setNicheCardData(null)
              setSelectedRecord(null)
            }}
          />
        ) : null
      )}

      {/* Transcript Modal */}
      {showTranscript && nicheCardData && (
        <NicheTranscript
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
          subPillarScores={nicheCardData.subPillarScores || {}}
          gradeId={nicheCardData.id}
          certificateToken={nicheCardData.certificate_token}
          autoDownload={autoTranscriptDownload}
          onClose={() => {
            setShowTranscript(false)
            setAutoTranscriptDownload(false)
            setNicheCardData(null)
            setSelectedRecord(null)
          }}
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
                        Cohort {getRomanNumeral(cohort.cohort_number)} - {cohort.status} — {formatDateWithOrdinal(cohort.start_date)} to {formatDateWithOrdinal(cohort.end_date)}
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
                disabled={isDownloadingPDF}
                className={`flex-1 px-4 py-2 bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${isDownloadingPDF ? 'opacity-75 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                {isDownloadingPDF ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}