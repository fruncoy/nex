import React from 'react'

interface NicheCertificateProps {
  recipientName: string
  role: string
  course: string
  tier: string
  finalScore: number
  cohortNumber: string
  graduationDate: string
  pillar1Score: number
  pillar2Score: number
  pillar3Score: number
  pillar4Score: number
  pillar1Weighted: number
  pillar2Weighted: number
  pillar3Weighted: number
  pillar4Weighted: number
  trainingType: string
  onClose: () => void
}

const NicheCertificate: React.FC<NicheCertificateProps> = ({
  recipientName,
  role,
  course,
  tier,
  finalScore,
  cohortNumber,
  graduationDate,
  pillar1Score,
  pillar2Score,
  pillar3Score,
  pillar4Score,
  pillar1Weighted,
  pillar2Weighted,
  pillar3Weighted,
  pillar4Weighted,
  trainingType,
  onClose
}) => {
  const nannyPillars = [
    { name: 'Childcare & Development', weight: 1.8, maxWeighted: 45 },
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping', weight: 0.6, maxWeighted: 15 },
    { name: 'Cooking & Nutrition', weight: 0.4, maxWeighted: 10 }
  ]

  const houseManagerPillars = [
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping & Systems', weight: 1.2, maxWeighted: 30 },
    { name: 'Cooking & Kitchen', weight: 1.0, maxWeighted: 25 },
    { name: 'Childcare Literacy', weight: 0.6, maxWeighted: 15 }
  ]

  const pillars = trainingType === 'nanny' ? nannyPillars : houseManagerPillars
  const pillarScores = [pillar1Score, pillar2Score, pillar3Score, pillar4Score]
  const weightedScores = [pillar1Weighted, pillar2Weighted, pillar3Weighted, pillar4Weighted]

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'MASTER': return '#FFD700'
      case 'DISTINGUISHED': return '#C8A45A'
      case 'EXCEPTIONAL': return '#DAA520'
      case 'EXCELLENT': return '#B8860B'
      default: return '#C8A45A'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] overflow-auto">
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Certificate Container */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-2xl overflow-hidden h-[70vh]">
            <div className="flex h-full">
              
              {/* Left Section - Main Certificate Area (70%) */}
              <div className="flex-1 bg-gradient-to-br from-gray-900 to-black p-8 relative">

                {/* Main Heading */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 tracking-widest">
                    NICHE Academy
                  </h1>
                </div>

                {/* Recipient Name */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-3">
                    <div className="h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent flex-1 max-w-16"></div>
                    <div className="mx-4 text-3xl font-script text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                      {recipientName}
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent flex-1 max-w-16"></div>
                  </div>
                </div>

                {/* Description */}
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed max-w-xl mx-auto">
                    Successfully completed the <span className="text-yellow-400 font-semibold">{course}</span> program 
                    as a <span className="text-yellow-400 font-semibold">{role}</span> with a final score of{' '}
                    <span className="text-yellow-400 font-bold">{finalScore.toFixed(1)}%</span> earning the{' '}
                    <span className="font-bold" style={{ color: getTierColor(tier) }}>{tier}</span> tier.
                  </p>
                </div>

                {/* Pillar Performance Cards */}
                <div className="mb-4">
                  <h3 className="text-yellow-400 font-semibold text-sm mb-3 text-center">Performance Breakdown</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {pillars.map((pillar, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-center">
                        <div className="text-gray-300 text-xs font-medium mb-1">{pillar.name}</div>
                        <div className="text-yellow-400 font-bold text-sm">
                          {weightedScores[index]?.toFixed(1)}/{pillar.maxWeighted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel - Certificate Details */}
              <div className="w-64 bg-white p-4 flex flex-col justify-between">
                
                {/* Certificate Details */}
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-gray-800 font-bold text-center mb-4 border-b border-gray-200 pb-2">Certificate Details</h3>
                  
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Final Score</div>
                      <div className="text-gray-800 font-bold text-2xl">{finalScore.toFixed(1)}%</div>
                    </div>
                    
                    <div className="text-center border-t border-gray-100 pt-3">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Achievement Tier</div>
                      <div className="font-bold text-lg" style={{ color: getTierColor(tier) }}>{tier}</div>
                    </div>
                    
                    <div className="text-center border-t border-gray-100 pt-3">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Cohort</div>
                      <div className="text-gray-800 font-semibold">{cohortNumber}</div>
                    </div>
                    
                    <div className="text-center border-t border-gray-100 pt-3">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Graduation</div>
                      <div className="text-gray-800 font-semibold text-sm">{graduationDate}</div>
                    </div>
                    
                    <div className="text-center border-t border-gray-100 pt-3">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Program</div>
                      <div className="text-gray-800 font-semibold text-sm">{course}</div>
                    </div>
                    
                    <div className="text-center border-t border-gray-100 pt-3">
                      <div className="text-gray-600 text-xs uppercase tracking-wide mb-1">Role</div>
                      <div className="text-gray-800 font-semibold text-sm">{role}</div>
                    </div>
                  </div>
                </div>
                
                {/* Year Badge */}
                <div className="text-center mt-4">
                  <div className="inline-block bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold px-6 py-2 rounded-full shadow-lg">
                    2025
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NicheCertificate