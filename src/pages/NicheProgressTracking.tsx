import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ProgressAssessment {
  id?: number
  trainee_id: string
  assessment_day: number
  assessment_date: string
  question_1_score: number | null
  question_2_score: number | null
  question_3_score: number | null
  total_score?: number
  instructor_notes: string
  red_flags: string
  improvement_areas: string
  assessed_by: string
  grader_comments?: string
}

interface PracticalAssessment {
  id?: number
  trainee_id: string
  assessment_week: number
  assessment_date: string
  // Kitchen
  oven_score: number | null
  microwave_score: number | null
  coffee_maker_score: number | null
  sandwich_maker_score: number | null
  toaster_score: number | null
  fryer_score: number | null
  blender_score: number | null
  gas_cooker_score: number | null
  cylinder_score: number | null
  // Refrigeration
  fridge_score: number | null
  freezer_score: number | null
  water_purifier_score: number | null
  water_dispensers_score: number | null
  // Laundry & Cleaning
  washing_machines_score: number | null
  vacuum_cleaner_score: number | null
  dishwasher_score: number | null
  // Floor Care
  polishing_machine_score: number | null
  floor_scrubber_score: number | null
  steam_vapour_machine_score: number | null
  floor_polisher_score: number | null
  carpet_shampooer_score: number | null
  bed_vacuum_score: number | null
  overall_score?: number
  assessed_by: string
}

interface AssessmentQuestion {
  id: number
  assessment_day: number
  question_number: number
  question_text: string
  pillar_focus: string
}

interface Trainee {
  id: string
  name: string
  cohort_id?: string
  role?: string
  course?: string
  training_type?: string
  status?: string
  phone?: string
  candidate_id?: string
  niche_cohorts?: { cohort_number: number; status: string }
}

const NicheProgressTracking: React.FC = () => {
  const { user, staff } = useAuth()
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [allCohorts, setAllCohorts] = useState<string[]>([])
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [assessments, setAssessments] = useState<ProgressAssessment[]>([])
  const [practicalAssessments, setPracticalAssessments] = useState<PracticalAssessment[]>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [selectedWeek, setSelectedWeek] = useState<number>(1)
  const [assessmentType, setAssessmentType] = useState<'regular' | 'practical'>('regular')
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [showAllProgress, setShowAllProgress] = useState<boolean>(false)
  const [selectedProgressDay, setSelectedProgressDay] = useState<number | 'all'>('all')
  const [selectedProgressTrainee, setSelectedProgressTrainee] = useState<string | null>(null)
  const [showAssessmentForm, setShowAssessmentForm] = useState<boolean>(false)
  const [currentAssessment, setCurrentAssessment] = useState<ProgressAssessment>({
    trainee_id: '',
    assessment_day: 1,
    assessment_date: new Date().toISOString().split('T')[0],
    question_1_score: null,
    question_2_score: null,
    question_3_score: null,
    instructor_notes: '',
    red_flags: '',
    improvement_areas: '',
    assessed_by: staff?.name || user?.email || 'Unknown',
    grader_comments: ''
  })
  const [currentPracticalAssessment, setCurrentPracticalAssessment] = useState<PracticalAssessment>({
    trainee_id: '',
    assessment_week: 1,
    assessment_date: new Date().toISOString().split('T')[0],
    oven_score: null,
    microwave_score: null,
    coffee_maker_score: null,
    sandwich_maker_score: null,
    toaster_score: null,
    fryer_score: null,
    blender_score: null,
    gas_cooker_score: null,
    cylinder_score: null,
    fridge_score: null,
    freezer_score: null,
    water_purifier_score: null,
    water_dispensers_score: null,
    washing_machines_score: null,
    vacuum_cleaner_score: null,
    dishwasher_score: null,
    polishing_machine_score: null,
    floor_scrubber_score: null,
    steam_vapour_machine_score: null,
    floor_polisher_score: null,
    carpet_shampooer_score: null,
    bed_vacuum_score: null,
    assessed_by: staff?.name || user?.email || 'Unknown'
  })
  const [loading, setLoading] = useState(false)

  const assessmentDays = [
    { day: 1, label: 'Baseline Assessment' },
    { day: 3, label: 'Day 3' },
    { day: 5, label: 'Day 5' },
    { day: 10, label: 'Day 10' }
  ]

  const equipmentCategories = {
    kitchen: [
      { key: 'oven_score', label: 'Oven' },
      { key: 'microwave_score', label: 'Microwave' },
      { key: 'coffee_maker_score', label: 'Coffee Maker' },
      { key: 'sandwich_maker_score', label: 'Sandwich Maker' },
      { key: 'toaster_score', label: 'Toaster' },
      { key: 'fryer_score', label: 'Fryer' },
      { key: 'blender_score', label: 'Blender' },
      { key: 'gas_cooker_score', label: 'Gas Cooker' },
      { key: 'cylinder_score', label: 'Cylinder' }
    ],
    refrigeration: [
      { key: 'fridge_score', label: 'Fridge' },
      { key: 'freezer_score', label: 'Freezer' },
      { key: 'water_purifier_score', label: 'Water Purifier' },
      { key: 'water_dispensers_score', label: 'Water Dispensers' }
    ],
    laundryAndCleaning: [
      { key: 'washing_machines_score', label: 'Washing Machines' },
      { key: 'vacuum_cleaner_score', label: 'Vacuum Cleaner' },
      { key: 'dishwasher_score', label: 'Dishwasher' }
    ],
    floorCare: [
      { key: 'polishing_machine_score', label: 'Polishing Machine' },
      { key: 'floor_scrubber_score', label: 'Floor Scrubber' },
      { key: 'steam_vapour_machine_score', label: 'Steam Vapour Machine' },
      { key: 'floor_polisher_score', label: 'Floor Polisher' },
      { key: 'carpet_shampooer_score', label: 'Carpet Shampooer' },
      { key: 'bed_vacuum_score', label: 'Bed Vacuum' }
    ]
  }

  const recommendations = ['Continue', 'Monitor Closely', 'Intervention Required', 'Consider Dismissal']

  useEffect(() => {
    fetchTrainees()
    fetchQuestions()
    fetchAssessments()
    fetchPracticalAssessments()
  }, [])

  const fetchTrainees = async () => {
    console.log('Starting to fetch trainees...')
    
    try {
      // First, let's fetch cohorts 4 and above with active/completed status
      const { data: cohortsData, error: cohortsError } = await supabase
        .from('niche_cohorts')
        .select('id, cohort_number, status')
        .gte('cohort_number', 4)
        .in('status', ['active', 'completed'])
        .order('cohort_number')
        
      console.log('Cohorts query:', { cohortsData, cohortsError })
      
      // First, let's see ALL records in niche_training
      const { data: allData, error: allError } = await supabase
        .from('niche_training')
        .select('*')
        .order('created_at', { ascending: false })
      
      console.log('ALL niche_training records:', { allData, allError, count: allData?.length })
      
      // Now fetch active trainees from cohort 4+ only
      const { data, error, count } = await supabase
        .from('niche_training')
        .select(`
          id, 
          name, 
          cohort_id, 
          role,
          course,
          training_type, 
          status,
          niche_cohorts!cohort_id(cohort_number, status)
        `, { count: 'exact' })
        .eq('status', 'Active')
        .order('created_at', { ascending: false })

      // Filter to only include trainees from cohort 4+
      const filteredData = data?.filter(trainee => 
        trainee.niche_cohorts && trainee.niche_cohorts.cohort_number >= 4
      ) || []

      console.log('Trainees query with join:', { data, error, count })
      
      if (error) {
        console.error('Error fetching trainees:', error)
      } else {
        setTrainees(filteredData)
        console.log('Trainees set:', filteredData.length)
        
        // Set cohorts for dropdown from separate query
        if (cohortsData && cohortsData.length > 0) {
          const cohortLabels = cohortsData.map(c => `Cohort ${c.cohort_number} (${c.status})`)
          setAllCohorts(cohortLabels)
          console.log('Setting cohorts for dropdown:', cohortLabels)
          // Set default to first cohort
          if (!selectedCohort) {
            setSelectedCohort(cohortLabels[0])
          }
        }
      }
      
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('niche_assessment_questions')
      .select('*')
      .order('assessment_day, question_number')

    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
  }

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from('niche_progress_assessments')
      .select('*')
      .order('assessment_date', { ascending: false })

    if (error) {
      console.error('Error fetching assessments:', error)
    } else {
      setAssessments(data || [])
    }
  }

  const fetchPracticalAssessments = async () => {
    const { data, error } = await supabase
      .from('niche_practical_assessments')
      .select('*')
      .order('assessment_date', { ascending: false })

    if (error) {
      console.error('Error fetching practical assessments:', error)
    } else {
      setPracticalAssessments(data || [])
    }
  }

  const handleAssessTrainee = (traineeId: string) => {
    setSelectedTrainee(traineeId)
    setShowAssessmentForm(true)
    setIsEditMode(false)
    setAssessmentType('regular')
    
    // Find the next unassessed day
    const traineeAssessments = assessments.filter(a => a.trainee_id === traineeId)
    const completedDays = traineeAssessments.map(a => a.assessment_day)
    const nextUnassessedDay = [1, 3, 5, 10].find(day => !completedDays.includes(day)) || 1
    
    setSelectedDay(nextUnassessedDay)
    setCurrentAssessment(prev => ({ ...prev, trainee_id: traineeId, assessed_by: staff?.name || user?.email || 'Unknown' }))
    
    // Load existing assessment if available for the selected day
    const existing = assessments.find(a => a.trainee_id === traineeId && a.assessment_day === nextUnassessedDay)
    if (existing) {
      setCurrentAssessment(existing)
    } else {
      setCurrentAssessment(prev => ({
        ...prev,
        trainee_id: traineeId,
        assessment_day: nextUnassessedDay,
        question_1_score: null,
        question_2_score: null,
        question_3_score: null,
        instructor_notes: '',
        red_flags: '',
        improvement_areas: '',
        assessed_by: staff?.name || user?.email || 'Unknown',
        grader_comments: ''
      }))
      setIsEditMode(true)
    }
  }

  const handleDaySelect = (day: number) => {
    setSelectedDay(day)
    setIsEditMode(false) // Reset to view mode when switching days
    setCurrentAssessment(prev => ({ ...prev, assessment_day: day, assessed_by: staff?.name || user?.email || 'Unknown' }))
    
    if (selectedTrainee) {
      const existing = assessments.find(a => a.trainee_id === selectedTrainee && a.assessment_day === day)
      if (existing) {
        setCurrentAssessment(existing)
      } else {
        setCurrentAssessment(prev => ({
          ...prev,
          assessment_day: day,
          question_1_score: null,
          question_2_score: null,
          question_3_score: null,
          instructor_notes: '',
          red_flags: '',
          improvement_areas: '',
          assessed_by: staff?.name || user?.email || 'Unknown',
          grader_comments: ''
        }))
        setIsEditMode(true) // New assessment starts in edit mode
      }
    }
  }

  const handleWeekSelect = (week: number) => {
    setSelectedWeek(week)
    setIsEditMode(false)
    if (selectedTrainee) {
      const existing = practicalAssessments.find(a => a.trainee_id === selectedTrainee && a.assessment_week === week)
      if (existing) {
        setCurrentPracticalAssessment(existing)
      } else {
        setCurrentPracticalAssessment(prev => ({
          ...prev,
          trainee_id: selectedTrainee,
          assessment_week: week,
          assessed_by: staff?.name || user?.email || 'Unknown'
        }))
        setIsEditMode(true)
      }
    }
  }

  const handleScoreChange = (questionNumber: number, score: number) => {
    setCurrentAssessment(prev => ({
      ...prev,
      [`question_${questionNumber}_score`]: score
    }))
  }

  const handlePracticalScoreChange = (equipmentKey: string, score: number) => {
    setCurrentPracticalAssessment(prev => {
      const updated = {
        ...prev,
        [equipmentKey]: score
      }
      
      // Calculate overall score
      const allEquipment = Object.values(equipmentCategories).flat()
      const scores = allEquipment.map(eq => updated[eq.key as keyof PracticalAssessment] as number | null).filter(s => s !== null) as number[]
      const overallScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null
      
      return {
        ...updated,
        overall_score: overallScore
      }
    })
  }

  const handleCloseAllProgress = () => {
    setShowAllProgress(false)
    setSelectedProgressTrainee(null)
    setSelectedProgressDay('all')
  }

  const downloadDailyProgressPDF = async () => {
    // Check if running locally
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('192.168') ||
                   window.location.port !== ''
    
    if (!isLocal) {
      alert('PDF download is only available when running locally. Please use your browser\'s print function (Ctrl+P) and select "Save as PDF".')
      return
    }

    try {
      // Get the progress content that's currently displayed
      const progressContent = document.querySelector('.progress-content')
      if (!progressContent) {
        alert('No progress content found for PDF generation')
        return
      }
      
      // Get the complete HTML with styles
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Progress Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .print\\:hidden { display: none !important; }
              .print\\:p-0 { padding: 0 !important; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              font-size: 12px;
            }
            /* Ensure burnt orange colors are preserved */
            .bg-\\[\\#AE491E\\] { background-color: #AE491E !important; }
            .text-\\[\\#AE491E\\] { color: #AE491E !important; }
            .border-\\[\\#AE491E\\] { border-color: #AE491E !important; }
            .border-b-\\[\\#AE491E\\] { border-bottom-color: #AE491E !important; }
            .border-t-\\[\\#AE491E\\] { border-top-color: #AE491E !important; }
            /* Hide print-hidden elements */
            .print\\:hidden { display: none !important; }
            
            /* Fix text wrapping and spacing issues */
            .text-xs { font-size: 10px !important; line-height: 1.3 !important; }
            .text-sm { font-size: 11px !important; line-height: 1.4 !important; }
            .text-lg { font-size: 14px !important; line-height: 1.4 !important; }
            
            /* Ensure proper text wrapping in grid cells */
            .grid > div {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              hyphens: auto !important;
              min-width: 0 !important;
            }
            
            /* Fix column headers to prevent text overlap */
            .grid-cols-5 > div {
              padding: 4px 2px !important;
              text-align: center !important;
              word-break: break-word !important;
              line-height: 1.2 !important;
            }
            
            /* Specific fixes for pillar names */
            .text-center {
              text-align: center !important;
              word-break: break-word !important;
              hyphens: auto !important;
            }
            
            /* Ensure adequate spacing */
            .gap-2 { gap: 4px !important; }
            .gap-4 { gap: 8px !important; }
            .gap-6 { gap: 12px !important; }
            
            /* Fix for assessment section headers */
            .tracking-wide {
              letter-spacing: 0.05em !important;
              word-spacing: 0.1em !important;
            }
            
            /* Better spacing for small text */
            .uppercase {
              font-size: 9px !important;
              font-weight: bold !important;
              line-height: 1.1 !important;
            }
          </style>
        </head>
        <body>
          ${progressContent.outerHTML}
        </body>
        </html>
      `
      
      // Send to Puppeteer service
      const response = await fetch('http://localhost:3001/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          filename: `NICHE_Progress_Report_${selectedCohort?.replace(/[^a-zA-Z0-9]/g, '_') || 'All_Cohorts'}_${new Date().toISOString().split('T')[0]}.pdf`,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            preferCSSPageSize: true
          }
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `NICHE_Progress_Report_${selectedCohort?.replace(/[^a-zA-Z0-9]/g, '_') || 'All_Cohorts'}_${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        
        console.log('Progress report PDF downloaded successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || 'PDF generation failed')
      }
    } catch (error) {
      console.error('Progress report PDF generation failed:', error)
      alert(`PDF generation failed: ${error.message}. Make sure the PDF service is running on localhost:3001`)
    }
  }

  const downloadProgressPDF = async () => {
    // Check if running locally
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('192.168') ||
                   window.location.port !== ''
    
    if (isLocal) {
      // Use Puppeteer for local development
      await downloadPuppeteerPDF()
    } else {
      // Fallback for online - use print dialog or disable
      handleOnlinePDFRequest()
    }
  }

  const downloadPuppeteerPDF = async () => {
    try {
      // Get the progress content HTML
      const progressContent = document.querySelector('.progress-content')
      if (!progressContent) {
        alert('No content found for PDF generation')
        return
      }
      
      // Get the complete HTML with styles
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Progress Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .print\\:hidden { display: none !important; }
              .print\\:p-0 { padding: 0 !important; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body>
          ${progressContent.outerHTML}
        </body>
        </html>
      `
      
      // Send to Puppeteer service
      const response = await fetch('http://localhost:3001/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          filename: `NICHE_Progress_${selectedCohort?.replace(/[^a-zA-Z0-9]/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `NICHE_Progress_${selectedCohort?.replace(/[^a-zA-Z0-9]/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        
        console.log('PDF downloaded successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || 'PDF generation failed')
      }
    } catch (error) {
      console.error('Puppeteer PDF generation failed:', error)
      alert(`PDF generation failed: ${error.message}. Make sure the PDF service is running on localhost:3001`)
    }
  }

  const handleOnlinePDFRequest = () => {
    // Option 1: Show message that PDF download is only available locally
    alert('PDF download is only available when running locally. Please use your browser\'s print function (Ctrl+P) and select "Save as PDF".')
    
    // Option 2: Automatically open print dialog
    // window.print()
    
    // Option 3: Redirect to a server-side PDF generation endpoint
    // window.open(`/api/pdf-report?cohort=${encodeURIComponent(selectedCohort || '')}`, '_blank')
  }

  const saveAssessment = async () => {
    if (!selectedTrainee) {
      alert('Please select a trainee')
      return
    }

    setLoading(true)
    
    if (assessmentType === 'regular') {
      // Save regular assessment
      const { total_score, id, ...assessmentData } = currentAssessment
      const dataToSave = {
        ...assessmentData,
        assessed_by: staff?.name || user?.email || 'Unknown'
      }
      
      const { data, error } = await supabase
        .from('niche_progress_assessments')
        .upsert([dataToSave], { 
          onConflict: 'trainee_id,assessment_day',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Error saving assessment:', error)
        alert('Error saving assessment')
      } else {
        alert('Assessment saved successfully')
        setIsEditMode(false)
        fetchAssessments()
      }
    } else {
      // Save practical assessment
      const { id, ...practicalData } = currentPracticalAssessment
      const dataToSave = {
        ...practicalData,
        assessed_by: staff?.name || user?.email || 'Unknown'
      }
      
      const { data, error } = await supabase
        .from('niche_practical_assessments')
        .upsert([dataToSave], { 
          onConflict: 'trainee_id,assessment_week',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Error saving practical assessment:', error)
        alert('Error saving practical assessment')
      } else {
        alert('Practical assessment saved successfully')
        setIsEditMode(false)
        fetchPracticalAssessments()
      }
    }
    
    setLoading(false)
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100'
    if (score <= 2) return 'bg-red-100 text-red-800'
    if (score === 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'Continue': return 'bg-green-100 text-green-800'
      case 'Monitor Closely': return 'bg-yellow-100 text-yellow-800'
      case 'Intervention Required': return 'bg-orange-100 text-orange-800'
      case 'Consider Dismissal': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100'
    }
  }

  const dayQuestions = questions.filter(q => q.assessment_day === selectedDay)
  const selectedTraineeData = trainees.find(t => t.id === selectedTrainee)
  const traineeAssessments = assessments.filter(a => a.trainee_id === selectedTrainee)
  
  // Filter and search logic with cohorts (cohort 4+ only)
  const uniqueCohorts = allCohorts.length > 0 ? allCohorts : [...new Set(trainees.map(t => t.niche_cohorts && t.niche_cohorts.cohort_number >= 4 ? `Cohort ${t.niche_cohorts.cohort_number} (${t.niche_cohorts.status})` : null).filter(Boolean))].sort()
  const filteredTrainees = trainees.filter(trainee => {
    const cohortLabel = trainee.niche_cohorts ? `Cohort ${trainee.niche_cohorts.cohort_number} (${trainee.niche_cohorts.status})` : null
    const matchesCohort = !selectedCohort || cohortLabel === selectedCohort
    const matchesSearch = !searchTerm || trainee.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCohort && matchesSearch
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">NICHE Progress Tracking</h1>
        
        {!showAssessmentForm && !showAllProgress && (
          <div className="mt-4 flex gap-4">
            <div className="w-2/4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Trainee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#AE491E] focus:border-transparent"
              />
            </div>
            <div className="w-1/4">
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#AE491E] focus:border-transparent appearance-none bg-white"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px'
                }}
              >
                <option value="">All Cohorts</option>
                {uniqueCohorts.map(cohort => (
                  <option key={cohort} value={cohort}>{cohort}</option>
                ))}
              </select>
            </div>
            <div className="w-1/4">
              <button
                onClick={() => setShowAllProgress(true)}
                className="w-full border-2 border-[#AE491E] text-[#AE491E] px-3 py-2 rounded-lg hover:bg-[#AE491E] hover:text-white transition-colors"
              >
                View Progress
              </button>
            </div>
          </div>
        )}
      </div>

      {!showAssessmentForm && !showAllProgress ? (
        // Trainees Table
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Trainees ({filteredTrainees.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No trainees found. Check your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTrainees.map((trainee, index) => {
                    const traineeAssessments = assessments.filter(a => a.trainee_id === trainee.id)
                    const completedDays = traineeAssessments.map(a => a.assessment_day).sort()
                    
                    return (
                      <tr key={trainee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{trainee.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {trainee.course || trainee.role || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {completedDays.length > 0 ? (
                            <div className="flex gap-1">
                              {[1, 3, 5, 10].map(day => (
                                <span
                                  key={day}
                                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                                    completedDays.includes(day)
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {day}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No assessments</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleAssessTrainee(trainee.id)}
                            className="bg-[#AE491E] text-white px-3 py-1 rounded-lg text-sm hover:bg-[#8B3A18] transition-colors"
                          >
                            Assess
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : showAllProgress ? (
        // All Progress Modal
        <div className="fixed inset-0 bg-white z-50">
          <div className="h-full w-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden flex-shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Progress Overview</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadDailyProgressPDF}
                  className="bg-[#AE491E] text-white px-4 py-2 rounded-lg hover:bg-[#8B3A18] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Daily Report
                </button>
                <button
                  onClick={handleCloseAllProgress}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Full Page Content */}
            <div className="flex-1 overflow-y-auto p-6 print:p-0">
              <div className="max-w-7xl mx-auto progress-content">
                {/* PDF Header */}
                <div className="text-center mb-8 print:mb-6">
                  <div className="bg-[#AE491E] text-white px-6 py-6 w-full">
                    <h1 className="text-3xl font-bold mb-2 tracking-wide">NICHE PROGRESS TRACKING REPORT</h1>
                    <p className="text-lg font-semibold">COHORT IV</p>
                  </div>
                </div>

                {/* Chart Visualization */}
                <div className="space-y-8">
                  {filteredTrainees.map((trainee, traineeIndex) => {
                    const traineeAssessments = assessments.filter(a => a.trainee_id === trainee.id)
                    const traineePracticalAssessments = practicalAssessments.filter(a => a.trainee_id === trainee.id)
                    
                    // Skip trainees with no assessments if viewing specific day
                    if (selectedProgressDay !== 'all' && !traineeAssessments.some(a => a.assessment_day === selectedProgressDay)) {
                      return null
                    }
                    
                    // Get all unique pillars from questions
                    const allPillars = [...new Set(questions.map(q => q.pillar_focus))]
                    const days = selectedProgressDay === 'all' ? [1, 3, 5, 10] : [selectedProgressDay as number]
                    
                    return (
                      <div key={trainee.id} className="student-section border-2 border-[#AE491E] rounded-lg mb-8 break-inside-avoid bg-white">
                        {/* Student Header */}
                        <div className="bg-white border-b-2 border-[#AE491E] p-4 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-[#AE491E]">{traineeIndex + 1}. {trainee.name.toUpperCase()}</h3>
                              <p className="text-gray-600 text-sm mt-1">
                                <span className="font-medium">Program:</span> {trainee.course || trainee.role || 'N/A'}
                              </p>
                            </div>
                            {trainee.niche_cohorts && (
                              <div className="text-right">
                                <div className="bg-[#AE491E] text-white px-3 py-1 rounded-full text-sm font-bold">
                                  COHORT {trainee.niche_cohorts.cohort_number}
                                </div>
                                <p className="text-xs text-gray-500 mt-1 capitalize">{trainee.niche_cohorts.status}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Assessment Content */}
                        <div className="p-6">
                          {/* Two Column Layout: Regular + Practical */}
                          <div className="grid grid-cols-2 gap-6">
                            {/* Column 1: Regular Assessment */}
                            <div className="border border-[#AE491E] rounded-lg overflow-hidden">
                              <div className="bg-white border-b border-[#AE491E] p-3">
                                <h4 className="text-sm font-bold tracking-wide text-center text-[#AE491E]">REGULAR ASSESSMENT</h4>
                                <p className="text-xs text-gray-600 text-center mt-1">Behavioral & Knowledge Evaluation</p>
                              </div>
                              <div className="bg-white p-4">
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                  {/* Header Row */}
                                  <div className="text-xs font-bold text-[#AE491E] text-center border-b border-[#AE491E] pb-2">PILLAR</div>
                                  {days.map(day => (
                                    <div key={day} className="text-xs font-bold text-[#AE491E] text-center border-b border-[#AE491E] pb-2">
                                      DAY {day}
                                    </div>
                                  ))}
                                  
                                  {/* Data Rows */}
                                  {allPillars.map(pillar => {
                                    return (
                                      <React.Fragment key={pillar}>
                                        <div className="text-xs font-semibold text-[#AE491E] py-2 pr-2 text-right border-r border-[#AE491E]">
                                          {pillar.toUpperCase()}
                                        </div>
                                        {days.map(day => {
                                          const dayAssessment = traineeAssessments.find(a => a.assessment_day === day)
                                          const dayQuestion = questions.find(q => q.assessment_day === day && q.pillar_focus === pillar)
                                          const score = dayQuestion && dayAssessment 
                                            ? dayAssessment[`question_${dayQuestion.question_number}_score` as keyof ProgressAssessment] as number | null
                                            : null
                                          
                                          return (
                                            <div key={`${pillar}-${day}`} className="flex items-center justify-center py-2">
                                              <div className={`rounded-full text-xs font-bold border-2 ${
                                                !score ? 'bg-gray-200 text-gray-400 border-gray-300' :
                                                score <= 2 ? 'bg-red-500 text-white border-red-600' :
                                                score === 3 ? 'bg-[#AE491E] text-white border-[#AE491E]' :
                                                'bg-green-500 text-white border-green-600'
                                              }`} style={{
                                                width: '30px',
                                                height: '30px',
                                                lineHeight: '26px',
                                                textAlign: 'center',
                                                display: 'inline-block'
                                              }}>
                                                {score || '-'}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </React.Fragment>
                                    )
                                  })}
                                </div>
                                
                                {/* Comments Section */}
                                {traineeAssessments.some(a => a.grader_comments) && (
                                  <div className="mt-4 pt-4 border-t-2 border-[#AE491E]">
                                    <h5 className="text-xs font-bold text-[#AE491E] mb-2 uppercase tracking-wide">Instructor Comments:</h5>
                                    <div className="space-y-2">
                                      {days.map(day => {
                                        const dayAssessment = traineeAssessments.find(a => a.assessment_day === day)
                                        if (!dayAssessment?.grader_comments) return null
                                        return (
                                          <div key={day} className="text-xs bg-orange-50 p-2 rounded border border-[#AE491E]">
                                            <span className="font-bold text-[#AE491E]">DAY {day}: </span>
                                            <span className="text-gray-700">{dayAssessment.grader_comments}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Practical Assessment */}
                            <div className="border border-[#AE491E] rounded-lg overflow-hidden">
                              <div className="bg-white border-b border-[#AE491E] p-3">
                                <h4 className="text-sm font-bold tracking-wide text-center text-[#AE491E]">PRACTICAL ASSESSMENT</h4>
                                <p className="text-xs text-gray-600 text-center mt-1">Equipment Operation & Skills</p>
                              </div>
                              <div className="bg-white p-4">
                                {traineePracticalAssessments.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-2 mb-4">
                                    {/* Header Row */}
                                    <div className="text-xs font-bold text-[#AE491E] text-center border-b border-[#AE491E] pb-2">CATEGORY</div>
                                    <div className="text-xs font-bold text-[#AE491E] text-center border-b border-[#AE491E] pb-2">WEEK 1</div>
                                    <div className="text-xs font-bold text-[#AE491E] text-center border-b border-[#AE491E] pb-2">WEEK 2</div>
                                    
                                    {/* Equipment Categories */}
                                    {Object.entries(equipmentCategories).map(([categoryKey, equipment]) => {
                                      const categoryName = categoryKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                                      
                                      return (
                                        <React.Fragment key={categoryKey}>
                                          <div className="text-xs font-semibold text-[#AE491E] py-2 pr-2 text-right border-r border-[#AE491E]">
                                            {categoryName.toUpperCase()}
                                          </div>
                                          {[1, 2].map(week => {
                                            const weekAssessment = traineePracticalAssessments.find(a => a.assessment_week === week)
                                            
                                            // Calculate average score for this category
                                            let categoryScore = null
                                            if (weekAssessment) {
                                              const scores = equipment.map(eq => weekAssessment[eq.key as keyof PracticalAssessment] as number | null).filter(s => s !== null) as number[]
                                              if (scores.length > 0) {
                                                categoryScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
                                              }
                                            }
                                            
                                            return (
                                              <div key={`${categoryKey}-${week}`} className="flex items-center justify-center py-2">
                                                <div className={`rounded-full text-xs font-bold border-2 ${
                                                  !categoryScore ? 'bg-gray-200 text-gray-400 border-gray-300' :
                                                  categoryScore <= 2 ? 'bg-red-500 text-white border-red-600' :
                                                  categoryScore === 3 ? 'bg-[#AE491E] text-white border-[#AE491E]' :
                                                  'bg-green-500 text-white border-green-600'
                                                }`} style={{
                                                  width: '30px',
                                                  height: '30px',
                                                  lineHeight: '26px',
                                                  textAlign: 'center',
                                                  display: 'inline-block'
                                                }}>
                                                  {categoryScore || '-'}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </React.Fragment>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-600 py-12 border-2 border-dashed border-[#AE491E] rounded-lg">
                                    <p className="text-sm font-medium text-[#AE491E]">NO PRACTICAL ASSESSMENTS</p>
                                    <p className="text-xs text-gray-500 mt-1">Assessments pending</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>


                        </div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>

                {/* Assessment Scale - Moved to end */}
                <div className="mt-8 pt-6 border-t-2 border-[#AE491E] bg-orange-50 p-6 rounded-lg">
                  <h5 className="text-lg font-bold text-[#AE491E] text-center mb-4 uppercase tracking-wide">Assessment Scale</h5>
                  <div className="flex justify-center gap-8 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-red-600"></div>
                      <span className="font-semibold">1-2 NEEDS WORK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#AE491E] rounded-full border-2 border-[#AE491E]"></div>
                      <span className="font-semibold">3 DEVELOPING</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                      <span className="font-semibold">4-5 PROFICIENT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-200 rounded-full border-2 border-gray-300"></div>
                      <span className="font-semibold">NOT ASSESSED</span>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="mt-6 pt-4 text-center text-xs text-gray-500">
                  <p>Internal Assessment Report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showAssessmentForm ? (
        // Assessment Form
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Assessment for {selectedTraineeData?.name}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAssessmentForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to List
              </button>
            </div>
          </div>
          
          {/* Assessment Type Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => {
                setAssessmentType('regular')
                setIsEditMode(false)
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                assessmentType === 'regular'
                  ? 'bg-white text-[#AE491E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Regular Assessment
            </button>
            <button
              onClick={() => {
                setAssessmentType('practical')
                setIsEditMode(false)
                
                // Find the next unassessed week for practical assessments
                const traineePracticalAssessments = practicalAssessments.filter(a => a.trainee_id === selectedTrainee)
                const completedWeeks = traineePracticalAssessments.map(a => a.assessment_week)
                const nextUnassessedWeek = [1, 2].find(week => !completedWeeks.includes(week)) || 1
                
                setSelectedWeek(nextUnassessedWeek)
                
                // Load practical assessment for the next unassessed week
                const existing = practicalAssessments.find(a => a.trainee_id === selectedTrainee && a.assessment_week === nextUnassessedWeek)
                if (existing) {
                  setCurrentPracticalAssessment(existing)
                } else {
                  setCurrentPracticalAssessment(prev => ({
                    ...prev,
                    trainee_id: selectedTrainee || '',
                    assessment_week: nextUnassessedWeek,
                    assessed_by: staff?.name || user?.email || 'Unknown'
                  }))
                  setIsEditMode(true)
                }
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                assessmentType === 'practical'
                  ? 'bg-white text-[#AE491E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Practical Assessment
            </button>
          </div>
                
                {/* Day Selection Tabs - Only show for regular assessments */}
                {assessmentType === 'regular' && (
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                      {assessmentDays.map(({ day, label }) => (
                        <button
                          key={day}
                          onClick={() => handleDaySelect(day)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            selectedDay === day
                              ? 'border-[#AE491E] text-[#AE491E]'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Assessment Questions */}
                {assessmentType === 'regular' ? (
                  <div className="space-y-4 mb-6">
                    {dayQuestions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-[#AE491E]">
                            {question.pillar_focus}
                          </span>
                        </div>
                        <div className="mb-3 text-gray-900">{question.question_text}</div>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => isEditMode ? handleScoreChange(question.question_number, score) : null}
                              disabled={!isEditMode}
                              className={`w-10 h-10 rounded-full border-2 font-medium transition-colors ${
                                currentAssessment[`question_${question.question_number}_score` as keyof ProgressAssessment] === score
                                  ? 'border-[#AE491E] bg-[#AE491E] text-white'
                                  : isEditMode 
                                    ? 'border-gray-300 text-gray-600 hover:border-gray-400 cursor-pointer'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          1=Concerning • 2=Needs Work • 3=Developing • 4=Good • 5=Strong
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 mb-6">
                    {/* Week Selection */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleWeekSelect(1)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedWeek === 1
                            ? 'bg-[#AE491E] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Week 1
                      </button>
                      <button
                        onClick={() => handleWeekSelect(2)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedWeek === 2
                            ? 'bg-[#AE491E] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Week 2
                      </button>
                    </div>

                    {/* Equipment Categories */}
                    {Object.entries(equipmentCategories).map(([categoryKey, equipment]) => (
                      <div key={categoryKey} className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium text-[#AE491E] mb-3 capitalize">
                          {categoryKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {equipment.map(item => (
                            <div key={item.key} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{item.label}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(score => (
                                  <button
                                    key={score}
                                    onClick={() => isEditMode ? handlePracticalScoreChange(item.key, score) : null}
                                    disabled={!isEditMode}
                                    className={`w-8 h-8 rounded-full border font-medium text-xs transition-colors ${
                                      currentPracticalAssessment[item.key as keyof PracticalAssessment] === score
                                        ? 'border-[#AE491E] bg-[#AE491E] text-white'
                                        : isEditMode 
                                          ? 'border-gray-300 text-gray-600 hover:border-gray-400 cursor-pointer'
                                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Overall Score Display */}
                    {currentPracticalAssessment.overall_score && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">Overall Score:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentPracticalAssessment.overall_score <= 2 ? 'bg-red-100 text-red-800' :
                            currentPracticalAssessment.overall_score === 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {currentPracticalAssessment.overall_score}/5
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      1=Cannot operate • 2=Basic awareness • 3=Can operate with guidance • 4=Independent operation • 5=Expert level
                    </div>
                  </div>
                )}

                {/* Grader Comments - Only for regular assessments */}
                {assessmentType === 'regular' && (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grader Comments
                      </label>
                      <textarea
                        value={currentAssessment.grader_comments || ''}
                        onChange={(e) => isEditMode ? setCurrentAssessment(prev => ({ ...prev, grader_comments: e.target.value })) : null}
                        disabled={!isEditMode}
                        placeholder="Provide specific feedback on the trainee's performance, strengths, and areas for improvement..."
                        className={`w-full p-2 border border-gray-300 rounded-lg ${
                          isEditMode 
                            ? 'bg-white cursor-text' 
                            : 'bg-gray-100 cursor-not-allowed text-gray-500'
                        }`}
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* Edit/Cancel buttons - Bottom right of entire form */}
                <div className="flex justify-end gap-3 mb-6">
                  {assessmentType === 'regular' && assessments.find(a => a.trainee_id === selectedTrainee && a.assessment_day === selectedDay) && !isEditMode && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {assessmentType === 'practical' && practicalAssessments.find(a => a.trainee_id === selectedTrainee && a.assessment_week === selectedWeek) && !isEditMode && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {isEditMode && (
                    <button
                      onClick={() => {
                        setIsEditMode(false)
                        if (assessmentType === 'regular') {
                          const existing = assessments.find(a => a.trainee_id === selectedTrainee && a.assessment_day === selectedDay)
                          if (existing) {
                            setCurrentAssessment(existing)
                          }
                        } else {
                          const existing = practicalAssessments.find(a => a.trainee_id === selectedTrainee && a.assessment_week === selectedWeek)
                          if (existing) {
                            setCurrentPracticalAssessment(existing)
                          }
                        }
                      }}
                      className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <button
                  onClick={saveAssessment}
                  disabled={loading || !isEditMode}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    isEditMode 
                      ? 'bg-[#AE491E] text-white hover:bg-[#8B3A18] disabled:opacity-50'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Saving...' : isEditMode ? `Save ${assessmentType === 'regular' ? 'Assessment' : 'Practical Assessment'}` : 'Assessment Locked'}
                </button>
        </div>
      ) : null}
    </div>
  )
}

export default NicheProgressTracking