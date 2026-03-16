import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

interface ProgressAssessment {
  id?: number
  trainee_id: string
  assessment_day: number
  assessment_date: string
  question_1_score: number | null
  question_2_score: number | null
  question_3_score: number | null
  question_4_score: number | null
  question_5_score: number | null
  total_score?: number
  instructor_notes: string
  red_flags: string
  improvement_areas: string
  recommendation: string
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
  const [selectedCohort, setSelectedCohort] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [showAllProgress, setShowAllProgress] = useState<boolean>(false)
  const [selectedProgressTrainee, setSelectedProgressTrainee] = useState<string | null>(null)
  const [showAssessmentForm, setShowAssessmentForm] = useState<boolean>(false)
  const [currentAssessment, setCurrentAssessment] = useState<ProgressAssessment>({
    trainee_id: '',
    assessment_day: 1,
    assessment_date: new Date().toISOString().split('T')[0],
    question_1_score: null,
    question_2_score: null,
    question_3_score: null,
    question_4_score: null,
    question_5_score: null,
    instructor_notes: '',
    red_flags: '',
    improvement_areas: '',
    recommendation: 'Continue',
    assessed_by: staff?.name || user?.email || 'Unknown'
  })
  const [loading, setLoading] = useState(false)

  const assessmentDays = [
    { day: 1, label: 'Day 1' },
    { day: 3, label: 'Day 3' },
    { day: 5, label: 'Day 5' },
    { day: 10, label: 'Day 10' }
  ]

  const recommendations = ['Continue', 'Monitor Closely', 'Intervention Required', 'Consider Dismissal']

  useEffect(() => {
    fetchTrainees()
    fetchQuestions()
    fetchAssessments()
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

  const handleAssessTrainee = (traineeId: string) => {
    setSelectedTrainee(traineeId)
    setShowAssessmentForm(true)
    setCurrentAssessment(prev => ({ ...prev, trainee_id: traineeId, assessed_by: staff?.name || user?.email || 'Unknown' }))
    
    // Load existing assessment if available
    const existing = assessments.find(a => a.trainee_id === traineeId && a.assessment_day === selectedDay)
    if (existing) {
      setCurrentAssessment(existing)
    } else {
      setCurrentAssessment(prev => ({
        ...prev,
        trainee_id: traineeId,
        assessment_day: selectedDay,
        question_1_score: null,
        question_2_score: null,
        question_3_score: null,
        question_4_score: null,
        question_5_score: null,
        instructor_notes: '',
        red_flags: '',
        improvement_areas: '',
        recommendation: 'Continue',
        assessed_by: staff?.name || user?.email || 'Unknown'
      }))
    }
  }

  const handleDaySelect = (day: number) => {
    setSelectedDay(day)
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
          question_4_score: null,
          question_5_score: null,
          instructor_notes: '',
          red_flags: '',
          improvement_areas: '',
          recommendation: 'Continue',
          assessed_by: staff?.name || user?.email || 'Unknown'
        }))
      }
    }
  }

  const handleScoreChange = (questionNumber: number, score: number) => {
    setCurrentAssessment(prev => ({
      ...prev,
      [`question_${questionNumber}_score`]: score
    }))
  }

  const handleCloseAllProgress = () => {
    setShowAllProgress(false)
    setSelectedProgressTrainee(null)
  }

  const downloadProgressPDF = async () => {
    try {
      // Get the content element
      const element = document.querySelector('.pdf-content') as HTMLElement
      if (!element) {
        alert('Content not found for PDF generation')
        return
      }
      
      // Create canvas from HTML
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      })
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      // Calculate dimensions for A4
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = 297 // A4 height in mm
      const imgWidth = pdfWidth - 20 // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 10 // top margin
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight - 20
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight - 20
      }
      
      // Download the PDF
      const fileName = `NICHE_Progress_Report_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again or use browser print instead.')
    }
  }

  const saveAssessment = async () => {
    if (!selectedTrainee) {
      alert('Please select a trainee')
      return
    }

    setLoading(true)
    
    const { data, error } = await supabase
      .from('niche_progress_assessments')
      .upsert([currentAssessment], { 
        onConflict: 'trainee_id,assessment_day',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Error saving assessment:', error)
      alert('Error saving assessment')
    } else {
      alert('Assessment saved successfully')
      fetchAssessments()
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
              <h3 className="text-lg font-semibold text-gray-900">All Progress Overview</h3>
              <button
                onClick={handleCloseAllProgress}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            {/* A4 Format Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-80px)] print:overflow-visible print:max-h-none p-6 print:p-0">
              <div className="p-8 bg-white print:p-0 pdf-content border border-gray-300" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
                {/* PDF Header */}
                <div className="text-center mb-8 print:mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">NICHE Progress Tracking Report</h1>
                  <p className="text-gray-600">Day 1 (Mon), Day 3 (Wed), Day 5 (Fri), Day 10 (Wed)</p>
                  <div className="mt-4 text-sm text-gray-500">
                    Total Trainees: {filteredTrainees.length} | Cohort: {selectedCohort || 'All Cohorts'}
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-6">
                  {filteredTrainees.map((trainee, traineeIndex) => {
                    const traineeAssessments = assessments.filter(a => a.trainee_id === trainee.id)
                    
                    return (
                      <div key={trainee.id} className="border border-gray-300 rounded-lg p-4 mb-4 break-inside-avoid">
                        <div className="mb-3">
                          <h3 className="text-base font-semibold text-gray-900">{trainee.name}</h3>
                          <p className="text-sm text-gray-600">{trainee.course || trainee.role || 'N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {[1, 3, 5, 10].map(day => {
                            const dayAssessment = traineeAssessments.find(a => a.assessment_day === day)
                            const dayQuestions = questions.filter(q => q.assessment_day === day)
                            
                            return (
                              <div key={day} className="border border-gray-200 rounded p-3">
                                <h4 className="font-medium text-gray-900 mb-2 text-sm">Day {day} {day === 1 ? '(Mon)' : day === 3 ? '(Wed)' : day === 5 ? '(Fri)' : '(Wed)'}</h4>
                                {dayAssessment ? (
                                  <div className="space-y-1">
                                    {dayQuestions.map((question) => {
                                      const score = dayAssessment[`question_${question.question_number}_score` as keyof ProgressAssessment] as number | null
                                      return (
                                        <div key={question.id} className="text-xs">
                                          <div className="text-gray-600">{question.pillar_focus}</div>
                                          <div className="font-medium">Score: {score || 'N/A'}/5</div>
                                        </div>
                                      )
                                    })}
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="text-xs font-medium">
                                        Recommendation: {dayAssessment.recommendation}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-xs">No assessment completed</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 text-center text-xs text-gray-500">
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
            <button
              onClick={() => setShowAssessmentForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to List
            </button>
          </div>
                
                {/* Day Selection Tabs */}
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

                {/* Assessment Questions */}
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
                            onClick={() => handleScoreChange(question.question_number, score)}
                            className={`w-10 h-10 rounded-full border-2 font-medium transition-colors ${
                              currentAssessment[`question_${question.question_number}_score` as keyof ProgressAssessment] === score
                                ? 'border-[#AE491E] bg-[#AE491E] text-white'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
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

                <button
                  onClick={saveAssessment}
                  disabled={loading}
                  className="w-full bg-[#AE491E] text-white py-2 px-4 rounded-lg hover:bg-[#8B3A18] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Assessment'}
                </button>
        </div>
      ) : null}
    </div>
  )
}

export default NicheProgressTracking