import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Phone, MapPin, Briefcase, Calendar, CheckCircle, AlertCircle, Search } from 'lucide-react'

interface ExistingCandidate {
  id: string
  name: string
  role: string
  status: string
  phone: string
}

interface WorkExperience {
  employer_name: string
  country: string
  start_date: string
  end_date: string
  still_working: boolean
}

export function CreateProfile() {
  const [phoneCheck, setPhoneCheck] = useState('')
  const [existingCandidate, setExistingCandidate] = useState<ExistingCandidate | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [profileSubmitted, setProfileSubmitted] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isQualified, setIsQualified] = useState<boolean | null>(null)
  const [qualificationReasons, setQualificationReasons] = useState<string[]>([])
  const [showContinueConfirm, setShowContinueConfirm] = useState(false)
  
  // Prevent accidental navigation on mobile
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (currentStep === 5) {
        e.preventDefault()
        window.history.pushState(null, '', window.location.href)
      }
    }
    
    // Save current step to prevent auto-navigation
    sessionStorage.setItem('createProfileStep', currentStep.toString())
    
    window.addEventListener('popstate', handlePopState)
    
    if (currentStep === 5) {
      window.history.pushState(null, '', window.location.href)
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [currentStep])
  
  // Restore step on page load to prevent auto-navigation
  useEffect(() => {
    const savedStep = sessionStorage.getItem('createProfileStep')
    if (savedStep && parseInt(savedStep) === 5) {
      // If user was on congratulations page, keep them there
      setCurrentStep(5)
    }
  }, [])
  
  const [qualificationData, setQualificationData] = useState({
    // Qualification screening
    referee_1_name: '',
    referee_1_phone: '',
    referee_2_name: '',
    referee_2_phone: '',
    has_referees: false,
    has_referees_answered: false
  })
  
  const [workExperiences, setWorkExperiences] = useState([{
    employer_name: '',
    country: '',
    start_date: '',
    end_date: '',
    still_working: false
  }])
  
  const [formData, setFormData] = useState({
    // Basic Info (for all candidates)
    name: '',
    phone: '',
    id_number: '',
    role: '',
    source: '',
    county: '',
    town: '',
    
    // Full form (only for qualified)
    email: '',
    live_arrangement: '',
    work_schedule: '',
    employment_type: '',
    estate: '',
    address: '',
    apartment: '',
    place_of_birth: '',
    marital_status: '',
    has_kids: null,
    kids_count: '',
    has_parents: '',
    expected_salary: '',
    off_day: '',
    next_of_kin_1_name: '',
    next_of_kin_1_phone: '',
    next_of_kin_1_location: '',
    next_of_kin_1_relationship: '',
    next_of_kin_2_name: '',
    next_of_kin_2_phone: '',
    next_of_kin_2_location: '',
    next_of_kin_2_relationship: '',
    has_siblings: null,
    dependent_siblings: '',
    education_level: '',
    notes: '',
    preferred_interview_date: ''
  })
  


  const roleOptions = ['Nanny', 'House Manager', 'Chef', 'Driver', 'Night Nurse', 'Caregiver', 'Housekeeper']
  const maritalOptions = ['Single', 'Married', 'Divorced', 'Widowed']
  const parentOptions = ['Both Parents', 'Single Parent', 'No Parents']
  const educationOptions = ['Primary', 'Secondary', 'College', 'University']
  const conductOptions = ['Valid Certificate', 'Applied (Receipt)', 'Expired', 'None']
  const countryOptions = ['Kenya', 'Saudi Arabia', 'Dubai', 'Qatar', 'UAE', 'Australia', 'Egypt', 'Other']
  const sourceOptions = ['TikTok', 'Facebook', 'Instagram', 'Google Search', 'Website', 'Referral', 'LinkedIn', 'Walk-in poster', 'Youtube']

  const normalizePhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('254')) return `+${cleaned}`
    if (cleaned.startsWith('07') || cleaned.startsWith('01')) return `+254${cleaned.substring(1)}`
    return phone
  }

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'WON': return "We're in the process of finding a job matching your salary and experience."
      case 'PENDING': return "Your application is pending. Please call our office to provide a few missing details."
      case 'INTERVIEW_SCHEDULED': return "Your interview has been scheduled. We'll contact you with details."
      case 'BLACKLISTED': return "Account suspended due to professional misconduct."
      default:
        if (status.startsWith('Lost,')) {
          const reason = status.replace('Lost, ', '')
          return `Application closed: ${reason}`
        }
        return status
    }
  }

  const handlePhoneCheck = async () => {
    if (!phoneCheck.trim()) return
    
    setLoading(true)
    try {
      const normalizedPhone = normalizePhone(phoneCheck)
      console.log('Checking phone:', phoneCheck, '-> normalized:', normalizedPhone)
      
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, role, status, phone')
        .eq('phone', normalizedPhone)
      
      console.log('Query result:', { data, error })
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      if (data && data.length > 0) {
        setExistingCandidate(data[0])
      } else {
        // Try searching without normalization in case phone formats differ
        const { data: altData } = await supabase
          .from('candidates')
          .select('id, name, role, status, phone')
          .ilike('phone', `%${phoneCheck.replace(/\D/g, '').slice(-9)}%`)
        
        console.log('Alternative search result:', altData)
        
        if (altData && altData.length > 0) {
          setExistingCandidate(altData[0])
        } else {
          setExistingCandidate(null)
          setCurrentStep(1)
          setFormData(prev => ({ ...prev, phone: normalizedPhone }))
        }
      }
    } catch (error) {
      console.error('Error checking phone:', error)
      setExistingCandidate(null)
      setCurrentStep(1)
      setFormData(prev => ({ ...prev, phone: normalizePhone(phoneCheck) }))
    } finally {
      setLoading(false)
    }
  }

  const checkQualification = (): { qualified: boolean, reasons: string[], score: number, status: string } => {
    const reasons: string[] = []
    let score = 0
    
    // Calculate Kenya years from work experiences
    const kenyaYears = workExperiences
      .filter(exp => exp.country === 'Kenya' && exp.employer_name && exp.start_date)
      .reduce((total, exp) => {
        const startYear = parseInt(exp.start_date.split('-')[0])
        const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
        return total + Math.max(0, endYear - startYear)
      }, 0)
    
    const hasGoodConduct = ['Valid Certificate', 'Application Receipt'].includes(formData.good_conduct_status)
    const refereeCount = [qualificationData.referee_1_name, qualificationData.referee_2_name].filter(Boolean).length
    
    // Kenya experience scoring
    if (kenyaYears >= 10) score += 40
    else if (kenyaYears >= 6) score += 35
    else if (kenyaYears >= 5) score += 30
    else if (kenyaYears >= 4) score += 25
    
    // Good conduct scoring
    if (formData.good_conduct_status === 'Valid Certificate') score += 20
    else if (formData.good_conduct_status === 'Application Receipt') score += 10
    
    // Referee scoring
    if (refereeCount >= 2) score += 25
    else if (refereeCount >= 1) score += 20
    
    // Check qualification rules
    if (kenyaYears < 4) {
      reasons.push('Minimum 4 years Kenya experience required')
    }
    
    if (refereeCount < 1) {
      reasons.push('At least 1 Kenyan referee required')
    }
    
    if (!hasGoodConduct && kenyaYears < 7) {
      reasons.push('Good Conduct Certificate required (unless 7+ years experience)')
    }
    
    const qualified = reasons.length === 0
    
    // Determine status
    let status = 'INTERVIEW_SCHEDULED'
    if (!qualified) {
      status = 'LOST'
    } else if (kenyaYears >= 7 && ['Nanny', 'Housekeeper', 'House Manager', 'Chef'].includes(formData.role)) {
      status = 'PENDING'
    }
    
    return { qualified, reasons, score, status }
  }



  const handleQualificationNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      // Final qualification check
      const { qualified, reasons, score } = checkQualification()
      setIsQualified(qualified)
      setQualificationReasons(reasons)
      
      if (qualified) {
        setCurrentStep(4) // Move to full form cards
      }
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Check if phone already exists - if so, update instead of insert
      const phoneToCheck = formData.phone || normalizePhone(phoneCheck)
      const { data: existingCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('phone', phoneToCheck)
        .single()
      
      const isUpdate = !!existingCandidate
      // Calculate Kenya years from work experiences
      const kenyaYears = workExperiences
        .filter(exp => exp.country === 'Kenya' && exp.employer_name && exp.start_date)
        .reduce((total, exp) => {
          const startYear = parseInt(exp.start_date.split('-')[0])
          const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
          return total + Math.max(0, endYear - startYear)
        }, 0)
      
      // Calculate total years experience from all work experiences
      const totalYearsExperience = workExperiences
        .filter(exp => exp.employer_name && exp.start_date)
        .reduce((total, exp) => {
          const startYear = parseInt(exp.start_date.split('-')[0])
          const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
          return total + Math.max(0, endYear - startYear)
        }, 0)
      
      // Calculate age from date of birth
      const birthDate = new Date(formData.place_of_birth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear() - 
        (today.getMonth() < birthDate.getMonth() || 
         (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0)
      
      // Calculate qualification score
      let score = 0
      const hasGoodConduct = ['Valid Certificate', 'Application Receipt'].includes(formData.good_conduct_status)
      const refereeCount = [qualificationData.referee_1_name, qualificationData.referee_2_name].filter(Boolean).length
      
      if (kenyaYears >= 10) score += 40
      else if (kenyaYears >= 6) score += 35
      else if (kenyaYears >= 5) score += 30
      else if (kenyaYears >= 4) score += 25
      
      if (formData.good_conduct_status === 'Valid Certificate') score += 20
      else if (formData.good_conduct_status === 'Application Receipt') score += 10
      
      if (refereeCount >= 2) score += 25
      else if (refereeCount >= 1) score += 20
      
      const candidateData = {
        name: formData.name,
        phone: formData.phone || normalizePhone(phoneCheck),
        id_number: formData.id_number,
        role: formData.role,
        county: formData.county,
        town: formData.town,
        place_of_birth: formData.place_of_birth,
        age: age,
        live_arrangement: formData.live_arrangement || null,
        
        // Qualification data
        good_conduct_status: formData.good_conduct_status,
        work_experiences: JSON.stringify(workExperiences.filter(exp => exp.employer_name)),
        kenya_years: kenyaYears,
        total_years_experience: totalYearsExperience,
        qualification_score: score,
        qualification_notes: isQualified ? 'Qualified candidate' : qualificationReasons.join(', '),
        referee_1_name: qualificationData.referee_1_name || null,
        referee_1_phone: qualificationData.referee_1_phone || null,
        referee_2_name: qualificationData.referee_2_name || null,
        referee_2_phone: qualificationData.referee_2_phone || null,
        
        // System fields
        source: formData.source,
        status: (() => {
          // Determine specific status based on qualification criteria
          const birthDate = new Date(formData.place_of_birth)
          const today = new Date()
          const age = today.getFullYear() - birthDate.getFullYear() - 
            (today.getMonth() < birthDate.getMonth() || 
             (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0)
          
          const hasReferees = !!(qualificationData.referee_1_name && qualificationData.referee_1_phone)
          const hasGoodConduct = ['Valid Certificate', 'Application Receipt'].includes(formData.good_conduct_status)
          
          // Check disqualifying factors first
          if (age < 24 || age > 45) return 'Lost, Age'
          if (kenyaYears < 4) return 'Lost, Experience'
          if (!hasReferees) return 'Lost, No References'
          
          // Special case: 7+ Kenya years but no good conduct = Pending, applying GC
          if (kenyaYears >= 7 && !hasGoodConduct) {
            return 'Pending, applying GC'
          }
          
          // Less than 7 years and no good conduct = Lost
          if (!hasGoodConduct) {
            return 'Lost, No Good Conduct'
          }
          
          // All requirements met = PENDING
          return 'PENDING'
        })(),
        lost_reason: isQualified ? null : qualificationReasons.join(', '),
        inquiry_date: new Date().toISOString().split('T')[0],
        preferred_interview_date: formData.preferred_interview_date || null,
        added_by: 'self'
      }
      
      // Add full form data only if qualified
      if (isQualified) {
        Object.assign(candidateData, {
          phone: formData.phone || normalizePhone(phoneCheck),
          email: formData.email || null,
          live_arrangement: formData.live_arrangement || null,
          work_schedule: formData.work_schedule || null,
          employment_type: formData.employment_type || null,
          county: formData.county || null,
          town: formData.town || null,
          estate: formData.estate || null,
          address: formData.address || null,
          apartment: formData.apartment || null,
          place_of_birth: formData.place_of_birth || null,
          marital_status: formData.marital_status || null,
          has_kids: formData.has_kids,
          kids_count: formData.has_kids ? parseInt(formData.kids_count) || 0 : null,
          has_parents: formData.has_parents || null,
          expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
          off_day: formData.off_day || null,
          next_of_kin_1_name: formData.next_of_kin_1_name || null,
          next_of_kin_1_phone: formData.next_of_kin_1_phone || null,
          next_of_kin_1_location: formData.next_of_kin_1_location || null,
          next_of_kin_1_relationship: formData.next_of_kin_1_relationship || null,
          next_of_kin_2_name: formData.next_of_kin_2_name || null,
          next_of_kin_2_phone: formData.next_of_kin_2_phone || null,
          next_of_kin_2_location: formData.next_of_kin_2_location || null,
          next_of_kin_2_relationship: formData.next_of_kin_2_relationship || null,
          has_siblings: formData.has_siblings,
          dependent_siblings: formData.has_siblings ? parseInt(formData.dependent_siblings) || 0 : null,
          education_level: formData.education_level || null,
          notes: formData.notes || null,
          preferred_interview_date: formData.preferred_interview_date || null
        })
      }

      let error
      if (isUpdate) {
        const { error: updateError } = await supabase
          .from('candidates')
          .update(candidateData)
          .eq('id', existingCandidate.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('candidates')
          .insert(candidateData)
        error = insertError
      }

      if (error) throw error
      
      // Show success screen
      setProfileSubmitted(true)
      
      if (!isQualified) {
        // For unqualified candidates, they stay on the "Not a Good Fit" screen
        // which is already handled by the isQualified === false check
      }
    } catch (error: any) {
      console.error('Error submitting profile:', error)
      alert(error?.message || 'Error submitting profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addWorkExperience = () => {
    setWorkExperiences([...workExperiences, { employer_name: '', country: 'Kenya', start_date: '', end_date: '', still_working: false }])
  }

  const removeWorkExperience = (index: number) => {
    setWorkExperiences(workExperiences.filter((_, i) => i !== index))
  }

  const updateWorkExperience = (index: number, field: keyof WorkExperience, value: any) => {
    const updated = [...workExperiences]
    updated[index] = { ...updated[index], [field]: value }
    setWorkExperiences(updated)
  }



  if (profileSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ae491e' }}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Nestara Family!</h2>
          <p className="text-gray-600 mb-6">You'll get a call from us in a moment. Thank you for your patience.</p>
          
          <a
            href="https://linktr.ee/nestaralimited"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition-colors block text-center"
            style={{ backgroundColor: '#ae491e' }}
          >
            Be Part of Our Team
          </a>
        </div>
      </div>
    )
  }

  if (existingCandidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Found</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Name</div>
              <div className="font-semibold">{existingCandidate.name}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Role</div>
              <div className="font-semibold">{existingCandidate.role}</div>
            </div>
            
          </div>
          
          <a
            href="https://linktr.ee/nestaralimited"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-6 bg-[#ae491e] text-white py-3 rounded-lg font-medium hover:bg-[#8e3a18] transition-colors text-center block"
          >
            Be Part of Our Team
          </a>
        </div>
      </div>
    )
  }

  // Show qualification result for unqualified candidates
  if (isQualified === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Not a Good Fit</h2>
          <p className="text-gray-600 mb-4">Sorry, you don't currently meet our requirements:</p>
          
          <div className="bg-red-50 p-4 rounded-lg mb-6">
            <ul className="text-left text-sm text-red-700 space-y-1">
              {qualificationReasons.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>
          

          
          <a
            href="https://linktr.ee/nestaralimited"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#ae491e] text-white py-3 rounded-lg font-medium hover:bg-[#8e3a18] transition-colors block text-center"
          >
            Be Part of Our Team
          </a>
        </div>
      </div>
    )
  }

  if (currentStep < 6) {
    // Phone check screen
    if (currentStep === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center mb-8">
              <Search className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Team</h1>
              <p className="text-gray-600">Enter your phone number to check if you're already in our system</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phoneCheck}
                  onChange={(e) => setPhoneCheck(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="07XXXXXXXX or +2547XXXXXXXX"
                />
              </div>
              
              <button
                onClick={() => {
                  if (phoneCheck.trim()) {
                    handlePhoneCheck()
                  } else {
                    setCurrentStep(1)
                    setFormData(prev => ({ ...prev, phone: '' }))
                  }
                }}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    // Qualification screening steps
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {currentStep === 1 ? 'Initial Candidate Review' : 
                 currentStep === 2 ? 'Work Experience' :
                 currentStep === 3 ? 'References' :
                 currentStep === 4 ? 'Confirm Details' :
                 currentStep === 5 ? 'Congratulations' : 'Qualification Check'}
              </h2>
              {currentStep !== 5 && <span className="text-sm text-gray-500">Step {currentStep} of 4</span>}
            </div>
            {currentStep !== 5 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
              </div>
            )}
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Do you have a valid certificate of good conduct? *</label>
                <select
                  value={formData.good_conduct_status}
                  onChange={(e) => setFormData({ ...formData, good_conduct_status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select status</option>
                  <option value="Valid Certificate">I have valid</option>
                  <option value="Application Receipt">I have an application receipt</option>
                  <option value="Expired">Expired</option>
                  <option value="None">I don't have one</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={formData.place_of_birth}
                  onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                <input
                  type="text"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Role</option>
                  {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us? *</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select source</option>
                  {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              {workExperiences.map((exp, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Experience {index + 1}</h4>
                    {workExperiences.length > 1 && (
                      <button
                        onClick={() => setWorkExperiences(workExperiences.filter((_, i) => i !== index))}
                        className="text-red-600 text-sm hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employer Name *</label>
                    <input
                      type="text"
                      value={exp.employer_name}
                      onChange={(e) => {
                        const updated = [...workExperiences]
                        updated[index].employer_name = e.target.value
                        setWorkExperiences(updated)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <select
                      value={exp.country}
                      onChange={(e) => {
                        const updated = [...workExperiences]
                        updated[index].country = e.target.value
                        setWorkExperiences(updated)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Country</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Qatar">Qatar</option>
                      <option value="UAE">UAE</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="month"
                      value={exp.start_date}
                      onChange={(e) => {
                        const updated = [...workExperiences]
                        updated[index].start_date = e.target.value
                        setWorkExperiences(updated)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={exp.still_working}
                        onChange={(e) => {
                          const updated = [...workExperiences]
                          updated[index].still_working = e.target.checked
                          if (e.target.checked) updated[index].end_date = ''
                          setWorkExperiences(updated)
                        }}
                        className="mr-2"
                      />
                      I still work here
                    </label>
                    {!exp.still_working && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                        <input
                          type="month"
                          value={exp.end_date}
                          onChange={(e) => {
                            const updated = [...workExperiences]
                            updated[index].end_date = e.target.value
                            setWorkExperiences(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setWorkExperiences([...workExperiences, { employer_name: '', country: '', start_date: '', end_date: '', still_working: false }])}
                className="text-blue-600 text-sm hover:text-blue-800"
              >
                + Add Another Experience
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Provide your professional references (Recommended)</p>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium mb-2">Referee 1</h4>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={qualificationData.referee_1_name || ''}
                    onChange={(e) => setQualificationData({ ...qualificationData, referee_1_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={qualificationData.referee_1_phone || ''}
                    onChange={(e) => setQualificationData({ ...qualificationData, referee_1_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-medium mb-2">Referee 2</h4>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={qualificationData.referee_2_name || ''}
                    onChange={(e) => setQualificationData({ ...qualificationData, referee_2_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={qualificationData.referee_2_phone || ''}
                    onChange={(e) => setQualificationData({ ...qualificationData, referee_2_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Good Conduct Status:</strong> {formData.good_conduct_status}</p>
                <p><strong>Age:</strong> {(() => {
                  const birthDate = new Date(formData.place_of_birth)
                  const today = new Date()
                  return today.getFullYear() - birthDate.getFullYear() - 
                    (today.getMonth() < birthDate.getMonth() || 
                     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0)
                })()} years</p>
                <p><strong>ID Number:</strong> {formData.id_number}</p>
                <p><strong>Role:</strong> {formData.role}</p>
                <div><strong>Work Experience:</strong></div>
                {workExperiences.filter(exp => exp.employer_name).map((exp, i) => (
                  <div key={i} className="ml-4 text-sm">
                    • {exp.employer_name} ({exp.country}) - {exp.start_date} to {exp.still_working ? 'Present' : exp.end_date}
                  </div>
                ))}
                <p><strong>Has References:</strong> {(qualificationData.referee_1_name && qualificationData.referee_1_phone) ? 'Yes' : 'No'}</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-3/4 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const hasReferees = !!(qualificationData.referee_1_name && qualificationData.referee_1_phone)
                    
                    // Calculate age from date of birth
                    const birthDate = new Date(formData.place_of_birth)
                    const today = new Date()
                    const age = today.getFullYear() - birthDate.getFullYear() - 
                      (today.getMonth() < birthDate.getMonth() || 
                       (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0)
                    
                    // Calculate Kenya years from work experiences
                    const kenyaYears = workExperiences
                      .filter(exp => exp.country === 'Kenya' && exp.employer_name && exp.start_date)
                      .reduce((total, exp) => {
                        const startYear = parseInt(exp.start_date.split('-')[0])
                        const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
                        return total + Math.max(0, endYear - startYear)
                      }, 0)
                    
                    const ageValid = age >= 24 && age <= 45
                    const conductValid = ['Valid Certificate', 'Application Receipt'].includes(formData.good_conduct_status)
                    const experienceValid = kenyaYears >= 4
                    
                    // Special case: 7+ Kenya years but no good conduct = still qualified for "Pending, applying GC"
                    const qualified = ageValid && experienceValid && (conductValid || kenyaYears >= 7) && hasReferees
                    
                    setIsQualified(qualified)
                    if (!qualified) {
                      const reasons = []
                      if (!ageValid) reasons.push(`Age requirement not met (must be 24-45 years, you are ${age} years)`)
                      if (!experienceValid) reasons.push('Minimum 4 years Kenya experience required')
                      if (!hasReferees) reasons.push('Professional references required')
                      if (!conductValid && kenyaYears < 7) reasons.push('Valid good conduct certificate or application receipt required (unless 7+ years experience)')
                      setQualificationReasons(reasons)
                      handleSubmit() // Save unqualified candidate as LOST
                    } else {
                      setCurrentStep(5) // Show congratulations for qualified, don't save yet
                    }
                  }}
                  className="w-1/4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg text-center border-2 border-green-200">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: '#ae491e' }}>
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Congratulations!</h2>
              <div className="bg-white p-4 rounded-lg mb-6 shadow-sm">
                <p className="text-green-700 font-medium text-lg mb-2">You qualify to become a Nestara Professional!</p>
                <p className="text-gray-600">Your status is now PENDING - just one more step to complete your full profile.</p>
              </div>
              <button
                onClick={() => setShowContinueConfirm(true)}
                className="w-full py-4 text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#ae491e' }}
              >
                Continue to Complete Profile
              </button>
              <p className="text-sm text-gray-500 mt-4 bg-yellow-50 p-2 rounded">This will take about 3-4 minutes to complete</p>
              
              {showContinueConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                    <h3 className="text-lg font-semibold mb-4">Continue to Full Application?</h3>
                    <p className="text-gray-600 mb-6">You'll need to complete your full profile with personal details, work experience, and references. This takes about 3-4 minutes.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowContinueConfirm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Stay Here
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowContinueConfirm(false)
                          setTimeout(() => setCurrentStep(6), 200)
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 touch-manipulation"
                        style={{ backgroundColor: '#ae491e', touchAction: 'manipulation' }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep < 3 && (
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  onClick={() => {
                    if (currentStep === 4) {
                      setQualificationData({ ...qualificationData, has_referees_answered: false });
                    }
                    setCurrentStep(currentStep - 1);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && (!formData.name || !formData.good_conduct_status || !formData.id_number || !formData.role || !formData.source || !formData.place_of_birth)) ||
                  (currentStep === 2 && !workExperiences.every(exp => exp.employer_name && exp.country && exp.start_date && (exp.still_working || exp.end_date)))
                }
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (showConfirmation) {
    const kenyaYears = workExperiences
      .filter(exp => exp.country === 'Kenya' && exp.employer_name && exp.start_date)
      .reduce((total, exp) => {
        const startYear = parseInt(exp.start_date.split('-')[0])
        const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
        return total + Math.max(0, endYear - startYear)
      }, 0)
    
    const totalYears = workExperiences
      .filter(exp => exp.employer_name && exp.start_date)
      .reduce((total, exp) => {
        const startYear = parseInt(exp.start_date.split('-')[0])
        const endYear = exp.still_working ? new Date().getFullYear() : parseInt(exp.end_date.split('-')[0])
        return total + Math.max(0, endYear - startYear)
      }, 0)
    
    let score = 0
    const hasGoodConduct = ['Valid Certificate', 'Application Receipt'].includes(formData.good_conduct_status)
    const refereeCount = [qualificationData.referee_1_name, qualificationData.referee_2_name].filter(Boolean).length
    
    if (kenyaYears >= 10) score += 40
    else if (kenyaYears >= 6) score += 35
    else if (kenyaYears >= 5) score += 30
    else if (kenyaYears >= 4) score += 25
    
    if (formData.good_conduct_status === 'Valid Certificate') score += 20
    else if (formData.good_conduct_status === 'Application Receipt') score += 10
    
    if (refereeCount >= 2) score += 25
    else if (refereeCount >= 1) score += 20
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="text-white p-6" style={{ backgroundColor: '#ae491e' }}>
              <div>
                <h1 className="text-2xl font-bold">NESTARA PROFESSIONAL ID</h1>
                <p className="text-orange-100">Confirm Your Application Details</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="border-l-4 pl-4" style={{ borderColor: '#ae491e' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{formData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{formData.phone || normalizePhone(phoneCheck)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID Number:</span>
                        <span className="font-medium">{formData.id_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{formData.email || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium">{formData.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Live Arrangement:</span>
                        <span className="font-medium">{formData.live_arrangement}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Work Schedule:</span>
                        <span className="font-medium">{formData.work_schedule || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employment Type:</span>
                        <span className="font-medium">{formData.employment_type || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">County:</span>
                        <span className="font-medium">{formData.county}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Town:</span>
                        <span className="font-medium">{formData.town}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estate:</span>
                        <span className="font-medium">{formData.estate || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium">{formData.address || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Marital Status:</span>
                        <span className="font-medium">{formData.marital_status || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Has Kids:</span>
                        <span className="font-medium">{formData.has_kids ? `Yes (${formData.kids_count})` : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parents Status:</span>
                        <span className="font-medium">{formData.has_parents || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Salary:</span>
                        <span className="font-medium">KSh {formData.expected_salary}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experience & Contacts */}
                <div className="space-y-6">
                  {/* Work Experience */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Years:</span>
                        <span className="font-medium">{totalYears} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kenya Years:</span>
                        <span className="font-medium">{kenyaYears} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Good Conduct:</span>
                        <span className="font-medium">{formData.good_conduct_status}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Experience Details:</div>
                      {workExperiences.filter(exp => exp.employer_name).map((exp, i) => (
                        <div key={i} className="text-sm text-gray-600 mb-1">
                          • {exp.employer_name} ({exp.country}) - {exp.start_date} to {exp.still_working ? 'Present' : exp.end_date}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next of Kin */}
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Next of Kin</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Contact 1:</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_1_name} ({formData.next_of_kin_1_relationship})</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_1_phone}</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_1_location}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Contact 2:</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_2_name} ({formData.next_of_kin_2_relationship})</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_2_phone}</div>
                        <div className="text-sm text-gray-600">{formData.next_of_kin_2_location}</div>
                      </div>
                    </div>
                  </div>

                  {/* References */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">References</h3>
                    <div className="space-y-3">
                      {qualificationData.referee_1_name && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Referee 1:</div>
                          <div className="text-sm text-gray-600">{qualificationData.referee_1_name}</div>
                          <div className="text-sm text-gray-600">{qualificationData.referee_1_phone}</div>
                        </div>
                      )}
                      {qualificationData.referee_2_name && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Referee 2:</div>
                          <div className="text-sm text-gray-600">{qualificationData.referee_2_name}</div>
                          <div className="text-sm text-gray-600">{qualificationData.referee_2_phone}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registration Details */}
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Preferred Interview Date:</span>
                        <span className="font-medium">{formData.preferred_interview_date ? new Date(formData.preferred_interview_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not specified'}</span>
                      </div>
                      {console.log('Debug - preferred_interview_date:', formData.preferred_interview_date)}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className="font-medium">{formData.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {formData.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h3>
                  <p className="text-gray-600">{formData.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#ae491e' }}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full form cards for qualified candidates
  if (currentStep >= 6) {
    const formStep = currentStep - 5 // Convert to form step (1, 2, 3, etc.)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">Complete Your Profile</h1>
                <p className="text-blue-100">Step {formStep} of 4</p>
              </div>
              <div className="text-sm">{Math.round((formStep / 4) * 100)}% Complete</div>
            </div>
            <div className="w-full bg-blue-500 rounded-full h-2 mt-3">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${(formStep / 4) * 100}%` }}></div>
            </div>
          </div>

          <div className="p-8">
            {formStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information - {formData.name}</h3>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100"
                  required
                  disabled
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100"
                  required
                  disabled
                >
                  <option value="">Select Role *</option>
                  {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="National ID Number *"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100"
                  required
                  disabled
                />
                <select
                  value={formData.live_arrangement}
                  onChange={(e) => setFormData({ ...formData, live_arrangement: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Live Arrangement *</option>
                  <option value="Live-In">Live-In</option>
                  <option value="Live-Out">Live-Out</option>
                </select>
                <select
                  value={formData.work_schedule}
                  onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Work Schedule</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                </select>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Employment Type</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                </select>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Personal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="County *"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Town *"
                    value={formData.town}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Estate"
                  value={formData.estate}
                  onChange={(e) => setFormData({ ...formData, estate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Where do you stay (Address)"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Apartment/House Number"
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.marital_status}
                  onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Marital Status</option>
                  {maritalOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.has_kids}
                      onChange={(e) => setFormData({ ...formData, has_kids: e.target.checked })}
                      className="mr-2"
                    />
                    Has Kids
                  </label>
                  {formData.has_kids && (
                    <input
                      type="number"
                      placeholder="How many?"
                      value={formData.kids_count}
                      onChange={(e) => setFormData({ ...formData, kids_count: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <select
                  value={formData.has_parents}
                  onChange={(e) => setFormData({ ...formData, has_parents: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Parents Status</option>
                  {parentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Expected Salary (KSh) *"
                  value={formData.expected_salary}
                  onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={formData.off_day}
                  onChange={(e) => setFormData({ ...formData, off_day: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Preferred Day Off</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.has_siblings}
                      onChange={(e) => setFormData({ ...formData, has_siblings: e.target.checked })}
                      className="mr-2"
                    />
                    Has Siblings
                  </label>
                  {formData.has_siblings && (
                    <input
                      type="number"
                      placeholder="How many depend on you?"
                      value={formData.dependent_siblings}
                      onChange={(e) => setFormData({ ...formData, dependent_siblings: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <select
                  value={formData.education_level}
                  onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Education Level</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                </select>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Next of Kin Details</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium mb-2">Next of Kin 1 *</h4>
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={formData.next_of_kin_1_name}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_1_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={formData.next_of_kin_1_phone}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_1_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Location (County/Town) *"
                      value={formData.next_of_kin_1_location}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_1_location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g., Mother, Brother) *"
                      value={formData.next_of_kin_1_relationship}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_1_relationship: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="border-l-4 border-gray-300 pl-4">
                    <h4 className="font-medium mb-2">Next of Kin 2 *</h4>
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={formData.next_of_kin_2_name}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_2_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={formData.next_of_kin_2_phone}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_2_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Location (County/Town) *"
                      value={formData.next_of_kin_2_location}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_2_location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g., Father, Sister) *"
                      value={formData.next_of_kin_2_relationship}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_2_relationship: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {formStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Interview Date</label>
                  <input
                    type="date"
                    value={formData.preferred_interview_date}
                    onChange={(e) => setFormData({ ...formData, preferred_interview_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes or Questions</label>
                  <textarea
                    rows={4}
                    placeholder="Any questions or additional information..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {formStep > 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              
              {formStep < 4 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmation(true)
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="flex-1 px-4 py-3 text-white rounded-lg hover:opacity-90 touch-manipulation"
                  style={{ backgroundColor: '#ae491e', touchAction: 'manipulation' }}
                >
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-2xl font-bold">Create Your Profile</h1>
          <p className="text-blue-100">Please fill in all required information</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Basic Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Official Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role Applying For *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Live Arrangement *</label>
                <select
                  required
                  value={formData.live_arrangement}
                  onChange={(e) => setFormData({ ...formData, live_arrangement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Live-In">Live-In</option>
                  <option value="Live-Out">Live-Out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">County *</label>
                <input
                  type="text"
                  required
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Town *</label>
                <input
                  type="text"
                  required
                  value={formData.town}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estate</label>
                <input
                  type="text"
                  value={formData.estate}
                  onChange={(e) => setFormData({ ...formData, estate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Number *</label>
                <input
                  type="text"
                  required
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Place of Birth</label>
                <input
                  type="text"
                  value={formData.place_of_birth}
                  onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                <select
                  value={formData.marital_status}
                  onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {maritalOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.has_kids}
                    onChange={(e) => setFormData({ ...formData, has_kids: e.target.checked })}
                    className="mr-2"
                  />
                  Has Kids
                </label>
                {formData.has_kids && (
                  <input
                    type="number"
                    placeholder="How many?"
                    value={formData.kids_count}
                    onChange={(e) => setFormData({ ...formData, kids_count: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parents Status</label>
                <select
                  value={formData.has_parents}
                  onChange={(e) => setFormData({ ...formData, has_parents: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {parentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Salary (KSh) *</label>
                <input
                  type="number"
                  required
                  value={formData.expected_salary}
                  onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Off Day</label>
                <select
                  value={formData.off_day}
                  onChange={(e) => setFormData({ ...formData, off_day: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Experience *</h3>
            {workExperiences.map((exp, index) => (
              <div key={index} className="bg-white p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employer Name *</label>
                    <input
                      type="text"
                      required
                      value={exp.employer_name}
                      onChange={(e) => updateWorkExperience(index, 'employer_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <select
                      required
                      value={exp.country}
                      onChange={(e) => updateWorkExperience(index, 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {countryOptions.map(country => <option key={country} value={country}>{country}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (MM/YYYY) *</label>
                    <input
                      type="month"
                      required
                      value={exp.start_date}
                      onChange={(e) => updateWorkExperience(index, 'start_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={exp.still_working}
                        onChange={(e) => updateWorkExperience(index, 'still_working', e.target.checked)}
                        className="mr-2"
                      />
                      I still work here
                    </label>
                    {!exp.still_working && (
                      <input
                        type="month"
                        required
                        value={exp.end_date}
                        onChange={(e) => updateWorkExperience(index, 'end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="End Date (MM/YYYY)"
                      />
                    )}
                  </div>
                </div>
                {workExperiences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkExperience(index)}
                    className="mt-2 text-red-600 text-sm hover:text-red-800"
                  >
                    Remove Experience
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addWorkExperience}
              className="text-blue-600 text-sm hover:text-blue-800"
            >
              + Add Another Experience
            </button>
          </div>

          {/* Next of Kin */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next of Kin (2 Required) *</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Next of Kin 1</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.next_of_kin_1_name}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_1_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={formData.next_of_kin_1_phone}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_1_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relationship (e.g., Mother, Brother)"
                    value={formData.next_of_kin_1_relationship}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_1_relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Next of Kin 2</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.next_of_kin_2_name}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_2_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={formData.next_of_kin_2_phone}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_2_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relationship (e.g., Father, Sister)"
                    value={formData.next_of_kin_2_relationship}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_2_relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.has_siblings}
                    onChange={(e) => setFormData({ ...formData, has_siblings: e.target.checked })}
                    className="mr-2"
                  />
                  Do you have siblings?
                </label>
                {formData.has_siblings && (
                  <input
                    type="number"
                    placeholder="How many depend on you?"
                    value={formData.dependent_siblings}
                    onChange={(e) => setFormData({ ...formData, dependent_siblings: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Highest Education Level</label>
                <select
                  value={formData.education_level}
                  onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {educationOptions.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Good Conduct Certificate *</label>
                <select
                  required
                  value={formData.good_conduct_status}
                  onChange={(e) => setFormData({ ...formData, good_conduct_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status</option>
                  {conductOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Interview Date</label>
                <input
                  type="date"
                  value={formData.preferred_interview_date}
                  onChange={(e) => setFormData({ ...formData, preferred_interview_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Kenyan Referees */}
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kenyan Referees (At least 1 required) *</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Referee 1</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.referee_1_name}
                    onChange={(e) => setFormData({ ...formData, referee_1_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={formData.referee_1_phone}
                    onChange={(e) => setFormData({ ...formData, referee_1_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Referee 2 (Optional)</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.referee_2_name}
                    onChange={(e) => setFormData({ ...formData, referee_2_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.referee_2_phone}
                    onChange={(e) => setFormData({ ...formData, referee_2_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes or Questions</h3>
            <textarea
              rows={4}
              placeholder="Any questions or additional information you'd like to share..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Review & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}