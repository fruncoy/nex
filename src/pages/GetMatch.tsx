import React, { useState, useEffect } from 'react'
import { Heart, Users, ChefHat, Baby, Star, Award, Phone, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Question {
  id: string
  pillar: string
  criterion: string
  question: string
  weight: number
}

interface Answers {
  [key: string]: number
}

const nannyQuestions: Question[] = [
  { id: 'cd', pillar: 'Childcare & Development', criterion: 'Child safety, routines, development activities', question: 'How important is having expertise in child safety, structured routines, age-appropriate activities, and nurturing care?', weight: 1.8 },
  { id: 'pc', pillar: 'Professional Conduct', criterion: 'Communication, reliability, boundaries', question: 'How important is clear communication, punctuality, reliability, and maintaining professional boundaries?', weight: 1.2 },
  { id: 'hs', pillar: 'Housekeeping', criterion: 'Child area cleanliness, organization, time management', question: 'How important is keeping child areas clean, organized, and managing household tasks efficiently?', weight: 0.6 },
  { id: 'cn', pillar: 'Cooking & Nutrition', criterion: 'Child nutrition, meal planning, food safety', question: 'How important is preparing nutritious meals for children, understanding food allergies, and maintaining kitchen hygiene?', weight: 0.4 }
]

const houseManagerQuestions: Question[] = [
  { id: 'pc', pillar: 'Professional Conduct', criterion: 'Communication, reliability, initiative, adaptability', question: 'How important is clear communication, reliability, taking initiative, and being adaptable to household needs?', weight: 1.2 },
  { id: 'hs', pillar: 'Housekeeping & Systems', criterion: 'Deep cleaning, organization, laundry, inventory management', question: 'How important is maintaining high cleaning standards, organization, proper laundry care, and household inventory management?', weight: 1.2 },
  { id: 'ck', pillar: 'Cooking & Kitchen', criterion: 'Meal planning, kitchen management, dietary needs', question: 'How important is planning varied meals, maintaining kitchen organization, and accommodating dietary restrictions?', weight: 1.0 },
  { id: 'cl', pillar: 'Childcare Literacy', criterion: 'Basic child safety, interaction, routine support', question: 'How important is understanding basic child safety, positive interaction with children, and supporting family routines?', weight: 0.6 }
]

export function GetMatch() {
  const [step, setStep] = useState<'intro' | 'role-selection' | 'questions' | 'results'>('intro')
  const [selectedRole, setSelectedRole] = useState<'nanny' | 'house_manager' | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [candidates, setCandidates] = useState<any[]>([])

  const questions = selectedRole === 'nanny' ? nannyQuestions : houseManagerQuestions
  const currentQuestion = questions[currentQuestionIndex]

  // Convert NICHE score to tier name
  const scoreToTier = (score: number) => {
    if (score >= 95) return 'Master'
    if (score >= 90) return 'Distinguished' 
    if (score >= 80) return 'Exceptional'
    if (score >= 70) return 'Excellent'
    return 'Needs Training'
  }

  // Calculate pillar scores and overall tier
  const calculateResults = () => {
    if (!selectedRole) return { pillars: {}, overallTier: 'Excellent', averageScore: 0 }

    // Pillar weights as percentages (total = 100%)
    const pillarWeights = selectedRole === 'nanny' 
      ? { 'Childcare & Development': 45, 'Professional Conduct': 30, 'Housekeeping': 15, 'Cooking & Nutrition': 10 }
      : { 'Professional Conduct': 30, 'Housekeeping & Systems': 30, 'Cooking & Kitchen': 25, 'Childcare Literacy': 15 }

    // Convert tier selection to NICHE-equivalent scores
    const tierToNicheScore = {
      2: 75, // Excellent
      3: 82, // Exceptional
      4: 92, // Distinguished  
      5: 97  // Master
    }

    const pillars: { [key: string]: { score: number, weightedScore: number, percentage: number } } = {}
    let totalWeightedScore = 0
    
    // Calculate weighted scores using NICHE-equivalent method
    questions.forEach(q => {
      const tierRating = answers[q.id] || 2
      const nicheScore = tierToNicheScore[tierRating as keyof typeof tierToNicheScore]
      const pillarWeight = pillarWeights[q.pillar as keyof typeof pillarWeights]
      const weightedScore = (nicheScore * pillarWeight) / 100
      
      pillars[q.pillar] = {
        score: nicheScore,
        weightedScore: weightedScore,
        percentage: pillarWeight
      }
      
      totalWeightedScore += weightedScore
    })

    const averageScore = totalWeightedScore
    
    // Determine overall tier based on weighted average
    let overallTier = 'Excellent'
    if (averageScore >= 95) overallTier = 'Master'        // 95-100
    else if (averageScore >= 90) overallTier = 'Distinguished' // 90-94
    else if (averageScore >= 80) overallTier = 'Exceptional'   // 80-89
    // 70-79 = Excellent
    
    return { pillars, overallTier, averageScore }
  }

  const results = calculateResults()

  // Get candidates from graded data
  const getCandidates = async () => {
    const { averageScore } = results
    
    console.log('Searching for candidates with score:', averageScore, 'Role:', selectedRole)
    
    const { data: candidates, error } = await supabase
      .from('trainee_grades')
      .select(`
        final_score,
        training_type,
        tier,
        pillar1_score,
        pillar2_score,
        pillar3_score,
        pillar4_score,
        niche_training!inner(
          name
        )
      `)
      .eq('training_type', selectedRole === 'nanny' ? 'nanny' : 'house_manager')
      .gte('final_score', Math.max(70, averageScore - 10)) // Narrower range, minimum 70
      .order('final_score', { ascending: false }) // Sort by highest score first
      .limit(5)
    
    if (error) {
      console.error('Query error:', error)
      return []
    }
    
    console.log('Candidates found:', candidates?.length || 0)
    
    // Calculate match scores and sort by best match
    const candidatesWithMatchScore = candidates?.map((item, index) => {
      // Calculate how close candidate is to user requirements
      const scoreDifference = Math.abs(item.final_score - averageScore)
      const matchScore = Math.max(0, 100 - scoreDifference) // Higher = better match
      
      return {
        id: index + 1,
        name: item.niche_training.name,
        final_score: item.final_score,
        tier: item.tier,
        pillar1_score: item.pillar1_score,
        pillar2_score: item.pillar2_score,
        pillar3_score: item.pillar3_score,
        pillar4_score: item.pillar4_score,
        matchScore: matchScore
      }
    }) || []
    
    // Sort by match score (best matches first)
    return candidatesWithMatchScore
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
  }

  // Load candidates when results change
  useEffect(() => {
    if (step === 'results' && selectedRole) {
      getCandidates().then(setCandidates)
    }
  }, [step, selectedRole, results.overallTier])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="mb-6">
                <h1 className="text-4xl font-bold mb-4" style={{color: '#AE491E'}}>
                  Find Your Perfect Match
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  To be able to match someone who fits you, assist us by answering a few questions to get your match.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <p className="text-gray-700 leading-relaxed">
                  Kindly take your time to understand and answer each question carefully. 
                  The higher you rate every question, the higher the skills, the higher the salary. Be mindful of that.
                </p>
              </div>

              <button
                onClick={() => setStep('role-selection')}
                className="px-8 py-4 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                style={{backgroundColor: '#AE491E'}}
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* Role Selection Step */}
        {step === 'role-selection' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4" style={{color: '#AE491E'}}>
                  What type of support do you need?
                </h2>
                <p className="text-gray-600 text-lg">
                  Choose the area where you need the most assistance
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Childcare Option */}
                <div 
                  className={`p-8 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedRole === 'nanny' 
                      ? 'border-orange-500 bg-orange-50 shadow-lg' 
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setSelectedRole('nanny')}
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4" style={{color: '#AE491E'}}>
                      Childcare
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Primary focus on child development, safety, routines, and nurturing care. 
                      Includes light housekeeping related to children and meal preparation for kids.
                    </p>
                  </div>
                </div>

                {/* House Management & Cooking Option */}
                <div 
                  className={`p-8 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedRole === 'house_manager' 
                      ? 'border-orange-500 bg-orange-50 shadow-lg' 
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setSelectedRole('house_manager')}
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4" style={{color: '#AE491E'}}>
                      House Management & Cooking
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Comprehensive household management, cooking, cleaning, organization, and coordination. 
                      Includes basic childcare knowledge and staff supervision.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => selectedRole && setStep('questions')}
                  disabled={!selectedRole}
                  className={`px-8 py-4 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                    selectedRole
                      ? 'text-white hover:shadow-xl transform hover:scale-105'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                  style={{backgroundColor: selectedRole ? '#AE491E' : undefined}}
                >
                  Get Matched
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions Step */}
        {step === 'questions' && currentQuestion && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium" style={{color: '#AE491E'}}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: '#AE491E',
                      width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Question Content */}
              <div className="mb-8">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-full" style={{backgroundColor: '#AE491E', color: 'white'}}>
                    {currentQuestion.pillar}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-800">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Rating Scale */}
              <div className="mb-8">
                <div className="flex justify-center gap-4">
                  {[2, 3, 4, 5].map((rating) => {
                    const isSelected = answers[currentQuestion.id] === rating
                    const labels = {
                      2: { tier: 'Excellent', desc: 'Competent professional with solid foundational skills.' },
                      3: { tier: 'Exceptional', desc: 'Highly skilled professional who performs confidently with minimal supervision.' },
                      4: { tier: 'Distinguished', desc: 'Proactive professional with excellent judgment, structure, and reliability.' }, 
                      5: { tier: 'Master', desc: 'Elite professional who manages complex household situations independently.' }
                    }
                    
                    return (
                      <button
                        key={rating}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: rating }))}
                        className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                          isSelected 
                            ? 'border-orange-500 shadow-lg' 
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? '#AE491E' : 'white',
                          color: isSelected ? 'white' : '#374151'
                        }}
                      >
                        <span className="text-xl font-bold mb-2">{labels[rating as keyof typeof labels].tier}</span>
                        <span className="text-sm text-center">{labels[rating as keyof typeof labels].desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    currentQuestionIndex === 0
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={() => {
                    if (currentQuestionIndex < questions.length - 1) {
                      setCurrentQuestionIndex(prev => prev + 1)
                    } else {
                      setStep('results')
                    }
                  }}
                  disabled={!answers[currentQuestion.id]}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    answers[currentQuestion.id]
                      ? 'text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                  style={{backgroundColor: answers[currentQuestion.id] ? '#AE491E' : undefined}}
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next →' : 'View Results →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && (
          <div className="max-w-6xl mx-auto">
            {/* Results Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4" style={{color: '#AE491E'}}>
                  Your Match Profile: {results.overallTier} Level
                </h2>
                <p className="text-gray-600 text-lg">
                  Overall: {results.overallTier}
                </p>
              </div>

              {/* Pillar Breakdown */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                {Object.entries(results.pillars).map(([pillar, data]) => (
                  <div key={pillar} className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold mb-2" style={{color: '#AE491E'}}>
                      {pillar} ({data.percentage}%)
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{results.overallTier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Matches */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4" style={{color: '#AE491E'}}>
                  Your Perfect Matches
                </h3>
                <p className="text-gray-600">
                  Based on your {results.overallTier} level requirements, here are our top recommendations
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.length > 0 ? candidates.map((candidate, index) => (
                  <div key={candidate.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                    {index === 0 && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
                        BEST MATCH
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold" style={{backgroundColor: '#AE491E'}}>
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <h4 className="text-xl font-bold text-gray-800">{candidate.name}</h4>
                      <p className="text-gray-600">{selectedRole === 'nanny' ? 'Nanny' : 'House Manager'}</p>
                      <p className="text-sm font-semibold" style={{color: '#AE491E'}}>
                        Overall: {candidate.tier}
                      </p>
                    </div>

                    <div className="space-y-2 mb-4">
                      {selectedRole === 'nanny' ? (
                        <>
                          <div className="text-sm">
                            <span className="font-medium">Childcare & Development:</span> {scoreToTier(candidate.pillar1_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Professional Conduct:</span> {scoreToTier(candidate.pillar2_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Housekeeping:</span> {scoreToTier(candidate.pillar3_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Cooking & Nutrition:</span> {scoreToTier(candidate.pillar4_score)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm">
                            <span className="font-medium">Professional Conduct:</span> {scoreToTier(candidate.pillar1_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Housekeeping & Systems:</span> {scoreToTier(candidate.pillar2_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Cooking & Kitchen:</span> {scoreToTier(candidate.pillar3_score)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Childcare Literacy:</span> {scoreToTier(candidate.pillar4_score)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-gray-500 text-lg">No matching candidates found in database.</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    setStep('intro')
                    setSelectedRole(null)
                    setAnswers({})
                    setCurrentQuestionIndex(0)
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Start New Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        {step !== 'intro' && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                if (step === 'role-selection') setStep('intro')
                else if (step === 'questions') setStep('role-selection')
                else if (step === 'results') setStep('questions')
              }}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}