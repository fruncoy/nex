import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Search, ChevronDown, Save, FileText, Download, AlertTriangle, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface Candidate {
  id: string
  name: string
  phone: string
  role: string
  status: string
  years_experience?: number
  certifications?: string[]
  languages?: string[]
  ages_experienced?: string[]
}

interface CandidateWithAssessment extends Candidate {
  assessment_status?: string
  assessment_id?: string
  overall_percentage?: number
}

interface Pillar {
  id: string
  name: string
  pillar_weight: number
  display_order: number
}

interface Criterion {
  id: string
  pillar_id: string
  name: string
  why_it_matters: string
  how_to_assess: string
  interviewer_question: string
  criterion_weight: number
  is_critical: boolean
  guidance_1: string
  guidance_2: string
  guidance_3: string
  guidance_4: string
  guidance_5: string
  red_flag_hints: string
  display_order: number
}

interface Response {
  criterion_id: string
  score: number | null
  notes: string
  red_flags: string
}

interface Assessment {
  id?: string
  candidate_id: string
  interview_date: string
  status: 'draft' | 'completed' | 'locked'
  overall_percentage?: number
  aggregate_score?: number
  onboard_recommendation?: boolean
  onboard_reason?: string
  key_strength?: string
  next_strength?: string
  development_needed?: string
  narrative?: string
}

export function Vetting() {
  const [candidates, setCandidates] = useState<CandidateWithAssessment[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithAssessment[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [selectedPillar, setSelectedPillar] = useState<string>('')
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [showCandidateSelection, setShowCandidateSelection] = useState(true)
  const [showVetModal, setShowVetModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [candidateDetails, setCandidateDetails] = useState({
    years_experience: 0,
    certifications: [] as string[],
    languages: [] as string[],
    ages_experienced: [] as string[]
  })

  const { user } = useAuth()
  const { showToast } = useToast()

  const ageOptions = ['Infant', 'Toddler', 'Preschooler', 'School Age', 'Teen']
  const statusOptions = ['PENDING', 'INTERVIEW_SCHEDULED', 'VETTED', 'ONBOARDED']

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, statusFilter])

  useEffect(() => {
    if (selectedCandidate) {
      loadOrCreateAssessment()
      setShowCandidateSelection(false)
    }
  }, [selectedCandidate])

  useEffect(() => {
    if (pillars.length > 0 && !selectedPillar) {
      setSelectedPillar(pillars[0].id)
    }
  }, [pillars])

  useEffect(() => {
    setCurrentCriterionIndex(0)
  }, [selectedPillar])

  const loadInitialData = async () => {
    try {
      const [candidatesRes, pillarsRes, criteriaRes] = await Promise.all([
        supabase.from('candidates').select(`
          *,
          assessments(
            id,
            status,
            overall_percentage
          )
        `).in('status', ['PENDING', 'INTERVIEW_SCHEDULED']),
        supabase.from('pillars').select('*').order('display_order'),
        supabase.from('criteria').select('*').order('display_order')
      ])

      const candidatesWithAssessments = (candidatesRes.data || []).map(candidate => {
        const assessment = candidate.assessments?.[0]
        let status = 'none'
        
        if (assessment) {
          status = assessment.status === 'completed' ? 'completed' : 'draft'
        }
        
        return {
          ...candidate,
          assessment_status: status,
          assessment_id: assessment?.id,
          overall_percentage: assessment?.overall_percentage
        }
      })
      
      setCandidates(candidatesWithAssessments)
      setPillars(pillarsRes.data || [])
      setCriteria(criteriaRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterCandidates = () => {
    let filtered = candidates.filter(candidate => 
      candidate.assessment_status === 'draft' || candidate.assessment_status === 'completed'
    )

    if (searchTerm) {
      filtered = filtered.filter(candidate => 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => {
        if (statusFilter === 'draft') {
          return candidate.assessment_status === 'draft'
        }
        if (statusFilter === 'completed') {
          return candidate.assessment_status === 'completed'
        }
        return true
      })
    }

    setFilteredCandidates(filtered)
  }

  const loadOrCreateAssessment = async () => {
    if (!selectedCandidate) return

    try {
      const { data: existingAssessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('candidate_id', selectedCandidate.id)
        .eq('status', 'draft')
        .single()

      if (existingAssessment) {
        setAssessment(existingAssessment)
        loadResponses(existingAssessment.id)
      } else {
        const newAssessment: Assessment = {
          candidate_id: selectedCandidate.id,
          interview_date: new Date().toISOString().split('T')[0],
          status: 'draft'
        }
        setAssessment(newAssessment)
        setResponses({})
      }

      setCandidateDetails({
        years_experience: selectedCandidate.years_experience || 0,
        certifications: selectedCandidate.certifications || [],
        languages: selectedCandidate.languages || [],
        ages_experienced: selectedCandidate.ages_experienced || []
      })
    } catch (error) {
      console.error('Error loading assessment:', error)
    }
  }

  const loadResponses = async (assessmentId: string) => {
    try {
      const { data } = await supabase
        .from('responses')
        .select('*')
        .eq('assessment_id', assessmentId)

      const responsesMap: Record<string, Response> = {}
      data?.forEach(r => {
        responsesMap[r.criterion_id] = {
          criterion_id: r.criterion_id,
          score: r.score,
          notes: r.notes || '',
          red_flags: r.red_flags || ''
        }
      })
      setResponses(responsesMap)
    } catch (error) {
      console.error('Error loading responses:', error)
    }
  }

  const updateResponse = (criterionId: string, updates: Partial<Response>) => {
    setResponses(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterion_id: criterionId,
        score: prev[criterionId]?.score || null,
        notes: prev[criterionId]?.notes || '',
        red_flags: prev[criterionId]?.red_flags || '',
        ...updates
      }
    }))
    
    // Auto-save after update
    setTimeout(() => saveAssessment(), 500)
  }

  const calculatePillarScore = (pillarId: string) => {
    const pillarCriteria = criteria.filter(c => c.pillar_id === pillarId)
    let totalWeightedScore = 0
    let totalWeight = 0

    pillarCriteria.forEach(criterion => {
      const response = responses[criterion.id]
      if (response?.score !== null && response?.score !== undefined) {
        totalWeightedScore += (response.score / 5) * criterion.criterion_weight
        totalWeight += criterion.criterion_weight
      }
    })

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0
  }

  const calculateOverallScore = () => {
    let totalWeightedScore = 0
    pillars.forEach(pillar => {
      const pillarScore = calculatePillarScore(pillar.id)
      totalWeightedScore += (pillarScore / 100) * pillar.pillar_weight
    })
    return totalWeightedScore * 100
  }

  const getCategoryFromScore = (score: number) => {
    if (score >= 80) return { name: 'Advanced', color: 'text-green-600 bg-green-100' }
    if (score >= 60) return { name: 'Intermediate', color: 'text-blue-600 bg-blue-100' }
    return { name: 'Basic', color: 'text-amber-600 bg-amber-100' }
  }

  const hasCriticalFailures = () => {
    return criteria.some(criterion => {
      if (!criterion.is_critical) return false
      const response = responses[criterion.id]
      return response?.score !== null && response.score <= 2
    })
  }

  const getAllQuestionsAnswered = () => {
    return criteria.every(c => responses[c.id]?.score !== null && responses[c.id]?.score !== undefined)
  }

  const saveAssessment = async () => {
    if (!selectedCandidate || !assessment) return

    setSaving(true)
    try {
      let assessmentId = assessment.id

      if (!assessmentId) {
        const { data: newAssessment, error } = await supabase
          .from('assessments')
          .insert({
            candidate_id: selectedCandidate.id,
            interviewer_id: user?.id,
            interview_date: assessment.interview_date,
            status: 'draft'
          })
          .select()
          .single()

        if (error) throw error
        assessmentId = newAssessment.id
        setAssessment(prev => prev ? { ...prev, id: assessmentId } : null)
      }

      // Save responses
      const responsesToSave = Object.values(responses).map(r => ({
        assessment_id: assessmentId,
        criterion_id: r.criterion_id,
        score: r.score,
        notes: r.notes,
        red_flags: r.red_flags
      }))

      await supabase.from('responses').upsert(responsesToSave)

      // Calculate and save summary
      const overallScore = calculateOverallScore()
      const aggregateScore = overallScore / 20
      const onboardRecommendation = overallScore >= 70 && !hasCriticalFailures()

      await supabase
        .from('assessments')
        .update({
          overall_percentage: overallScore,
          aggregate_score: aggregateScore,
          onboard_recommendation: onboardRecommendation
        })
        .eq('id', assessmentId)

      showToast('Assessment saved successfully', 'success')
    } catch (error) {
      console.error('Error saving assessment:', error)
      showToast('Failed to save assessment', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateCandidateStatus = async (newStatus: string) => {
    if (!selectedCandidate) return

    try {
      await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', selectedCandidate.id)

      setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null)
      showToast('Status updated successfully', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const selectedPillarCriteria = criteria.filter(c => c.pillar_id === selectedPillar)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow h-96"></div>
        </div>
      </div>
    )
  }

  if (showCandidateSelection) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nestara Nanny Assessment</h1>
            <p className="text-gray-600">Comprehensive vetting workflow for candidate evaluation</p>
          </div>
          <button
            onClick={() => setShowVetModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Vet Candidate
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.assessment_status === 'completed' ? 'bg-green-100 text-green-800' :
                        candidate.assessment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {candidate.assessment_status === 'completed' ? 'Completed' :
                         candidate.assessment_status === 'draft' ? 'Draft' : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.overall_percentage ? `${candidate.overall_percentage}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={async () => {
                          if (candidate.assessment_status === 'completed') {
                            setSelectedCandidate(candidate)
                            // Load assessment and responses for summary
                            const { data: assessmentData } = await supabase
                              .from('assessments')
                              .select('*')
                              .eq('id', candidate.assessment_id)
                              .single()
                            
                            if (assessmentData) {
                              setAssessment(assessmentData)
                              await loadResponses(assessmentData.id)
                            }
                            setShowSummaryModal(true)
                          } else {
                            setSelectedCandidate(candidate)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        {candidate.assessment_status === 'completed' ? 'View Summary' : 
                         candidate.assessment_status === 'none' ? 'Start Assessment' : 'Continue'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCandidates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No candidates found matching your criteria.
            </div>
          )}
        </div>

        {/* Vet Candidate Modal */}
        {showVetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Candidate to Vet
                </h2>

                <div className="mb-4">
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <select
                    onChange={(e) => {
                      const candidate = candidates.find(c => c.id === e.target.value)
                      if (candidate) {
                        setSelectedCandidate(candidate)
                        setShowVetModal(false)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    size={8}
                  >
                    <option value="">Choose a candidate...</option>
                    {candidates
                      .filter(candidate => 
                        modalSearchTerm === '' || 
                        candidate.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                        candidate.phone.includes(modalSearchTerm)
                      )
                      .map(candidate => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} - {candidate.phone} ({candidate.status})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowVetModal(false)
                      setModalSearchTerm('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {showSummaryModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Assessment Summary - {selectedCandidate.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSummaryModal(false)
                      setSelectedCandidate(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Overall Score</h3>
                    <div className="text-3xl font-bold text-blue-600">
                      {calculateOverallScore().toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-700">
                      ({(calculateOverallScore() / 20).toFixed(1)}/5)
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    hasCriticalFailures() ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      hasCriticalFailures() ? 'text-red-900' : 'text-green-900'
                    }`}>
                      Recommendation
                    </h3>
                    <div className={`text-lg font-bold ${
                      hasCriticalFailures() ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {calculateOverallScore() >= 70 && !hasCriticalFailures() ? 'ONBOARD' : 'DO NOT ONBOARD'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Pillar Breakdown</h3>
                  <div className="space-y-3">
                    {pillars.map(pillar => {
                      const score = calculatePillarScore(pillar.id)
                      const category = getCategoryFromScore(score)
                      return (
                        <div key={pillar.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{pillar.name}</div>
                            <div className="text-sm text-gray-600">Weight: {(pillar.pillar_weight * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{score.toFixed(1)}%</div>
                            <div className={`text-xs px-2 py-1 rounded-full ${category.color}`}>
                              {category.name}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowSummaryModal(false)
                      setSelectedCandidate(null)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedCandidate(null)
              setShowCandidateSelection(true)
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Selection
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment: {selectedCandidate?.name}
          </h1>
        </div>
        
        {selectedCandidate && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDetailsDrawer(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adjust Details
            </button>
          </div>
        )}
      </div>

      {selectedCandidate && (
        <div className="flex gap-6">
          {/* Left Navigation */}
          <div className="w-56 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Assessment Pillars</h3>
            <nav className="space-y-1">
              {pillars.map(pillar => {
                const score = calculatePillarScore(pillar.id)
                const category = getCategoryFromScore(score)
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setSelectedPillar(pillar.id)}
                    className={`w-full text-left p-2 rounded transition-colors hover:bg-gray-50 ${
                      selectedPillar === pillar.id
                        ? 'border-l-2 border-blue-500 bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{pillar.name}</div>
                    <div className="text-xs text-gray-500">
                      {score.toFixed(1)}% - {category.name}
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Overall Score</div>
              <div className="text-lg font-bold text-nestalk-primary">
                {calculateOverallScore().toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                ({(calculateOverallScore() / 20).toFixed(1)}/5)
              </div>
            </div>
          </div>

          {/* Main Assessment Area */}
          <div className="flex-1">
            {selectedPillarCriteria.length > 0 && (
              <div>
                {(() => {
                  const criterion = selectedPillarCriteria[currentCriterionIndex]
                  if (!criterion) return null
                  
                  const response = responses[criterion.id] || { criterion_id: criterion.id, score: null, notes: '', red_flags: '' }
                  const criterionScore = response.score ? (response.score / 5) * 100 : 0
                  const hasCriticalIssue = criterion.is_critical && response.score !== null && response.score <= 2

                  return (
                    <div className={`bg-white rounded-lg shadow-sm border p-6 ${
                      hasCriticalIssue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      {hasCriticalIssue && (
                        <div className="flex items-center mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                          <span className="text-red-800 font-medium">Critical Issue - Review Required</span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">
                            Question {currentCriterionIndex + 1} of {selectedPillarCriteria.length}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{criterion.name}</h3>
                          {criterion.is_critical && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Score</div>
                          <div className="text-lg font-bold text-nestalk-primary">
                            {criterionScore.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Why it matters</h4>
                            <p className="text-sm text-gray-600">{criterion.why_it_matters}</p>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">How to assess</h4>
                            <p className="text-sm text-gray-600">{criterion.how_to_assess}</p>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Interviewer Question</h4>
                            <p className="text-sm font-medium text-gray-900 bg-blue-50 p-3 rounded-lg">
                              {criterion.interviewer_question}
                            </p>
                          </div>

                          {criterion.red_flag_hints && (
                            <div>
                              <h4 className="font-medium text-red-700 mb-2">Red Flag Hints</h4>
                              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                {criterion.red_flag_hints}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Score (1-5)</h4>
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map(score => (
                                <label key={score} className="flex items-center">
                                  <input
                                    type="radio"
                                    name={`score-${criterion.id}`}
                                    value={score}
                                    checked={response.score === score}
                                    onChange={() => updateResponse(criterion.id, { score })}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{score}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                              <div>1: {criterion.guidance_1}</div>
                              <div>2: {criterion.guidance_2}</div>
                              <div>3: {criterion.guidance_3}</div>
                              <div>4: {criterion.guidance_4}</div>
                              <div>5: {criterion.guidance_5}</div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes/Evidence
                            </label>
                            <textarea
                              value={response.notes}
                              onChange={(e) => updateResponse(criterion.id, { notes: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                              placeholder="Record observations and evidence..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-2">
                              Red Flags (if any)
                            </label>
                            <textarea
                              value={response.red_flags}
                              onChange={(e) => updateResponse(criterion.id, { red_flags: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Note any concerning responses or behaviors..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setCurrentCriterionIndex(Math.max(0, currentCriterionIndex - 1))}
                          disabled={currentCriterionIndex === 0}
                          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Back
                        </button>
                        
                        {currentCriterionIndex === selectedPillarCriteria.length - 1 && selectedPillar === pillars[pillars.length - 1]?.id ? (
                          <button
                            onClick={async () => {
                              const allAnswered = criteria.every(c => responses[c.id]?.score !== null && responses[c.id]?.score !== undefined)
                              if (!allAnswered) {
                                showToast('Please answer all questions before completing', 'error')
                                return
                              }
                              
                              await supabase
                                .from('assessments')
                                .update({ status: 'completed' })
                                .eq('id', assessment?.id)
                              
                              showToast('Assessment completed successfully', 'success')
                              await loadInitialData()
                              setSelectedCandidate(null)
                              setShowCandidateSelection(true)
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Complete Assessment
                          </button>
                        ) : currentCriterionIndex === selectedPillarCriteria.length - 1 ? (
                          <button
                            onClick={() => {
                              const currentPillarIndex = pillars.findIndex(p => p.id === selectedPillar)
                              if (currentPillarIndex < pillars.length - 1) {
                                setSelectedPillar(pillars[currentPillarIndex + 1].id)
                                setCurrentCriterionIndex(0)
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Next Pillar →
                          </button>
                        ) : (
                          <button
                            onClick={() => setCurrentCriterionIndex(Math.min(selectedPillarCriteria.length - 1, currentCriterionIndex + 1))}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()
              }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {showDetailsDrawer && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Candidate Details - {selectedCandidate.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={candidateDetails.years_experience}
                    onChange={(e) => setCandidateDetails(prev => ({
                      ...prev,
                      years_experience: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ages Experienced (select multiple)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ageOptions.map(age => (
                      <label key={age} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={candidateDetails.ages_experienced.includes(age)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCandidateDetails(prev => ({
                                ...prev,
                                ages_experienced: [...prev.ages_experienced, age]
                              }))
                            } else {
                              setCandidateDetails(prev => ({
                                ...prev,
                                ages_experienced: prev.ages_experienced.filter(a => a !== age)
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{age}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await supabase
                        .from('candidates')
                        .update(candidateDetails)
                        .eq('id', selectedCandidate.id)
                      
                      setSelectedCandidate(prev => prev ? { ...prev, ...candidateDetails } : null)
                      setShowDetailsDrawer(false)
                      showToast('Details updated successfully', 'success')
                    } catch (error) {
                      showToast('Failed to update details', 'error')
                    }
                  }}
                  className="px-4 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}