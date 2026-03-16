import React from 'react'
import html2canvas from 'html2canvas'

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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] overflow-auto">
        {/* Close Button and Download */}
        <div className="flex justify-between p-4">
          <button
            onClick={() => {
              const element = document.getElementById('certificate-content');
              if (element) {
                html2canvas(element, {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff'
                }).then(canvas => {
                  const link = document.createElement('a');
                  link.download = `${recipientName.replace(/\s+/g, '_')}_NICHE_Certificate.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                });
              }
            }}
            className="flex items-center gap-2 bg-[#AE491E] text-white px-4 py-2 rounded-lg hover:bg-[#8B3A18] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Cert
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Certificate Container - Full Landscape Format */}
        <div className="px-8 pb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden aspect-[4/3] relative" style={{ minHeight: '600px' }} id="certificate-content">
            
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1" fill="#AE491E" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
            
            {/* Certificate Content */}
            <div className="h-full flex flex-col justify-between p-12">
              
              {/* Header */}
              <div className="text-center mb-2">
                <h1 className="text-5xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'serif' }}>
                  CERTIFICATE OF MERIT
                </h1>
                <p className="text-sm text-gray-600">Nestara Institute of Care and Hospitality Excellence</p>
              </div>

              {/* Main Content */}
              <div className="text-center flex-1 flex flex-col justify-center -mt-8">
                <p className="text-lg text-gray-700">This honor is proudly bestowed upon</p>
                
                <div className="mb-6">
                  <h3 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'serif' }}>
                    {recipientName}
                  </h3>
                </div>
                
                <div className="max-w-4xl mx-auto mb-8">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    In recognition of her exceptional dedication and outstanding achievement within the{' '}
                    <span className="font-semibold text-gray-800">{course}</span>. {recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, 
                    exhibiting a level of competency that transcends standard expectations and earns her the rank of{' '}
                    <span className="font-bold text-xl" style={{ color: '#AE491E' }}>{tier}</span>.
                  </p>
                </div>

                {/* Performance Summary */}
                <div className="bg-gray-50 rounded-lg p-6 max-w-4xl mx-auto mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Professional Competency Assessment</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {pillars.map((pillar, index) => (
                      <div key={index} className="text-center">
                        <div className="text-sm font-medium text-gray-600 mb-1">{pillar.name}</div>
                        <div className="text-lg font-bold text-gray-800">
                          {weightedScores[index]?.toFixed(1)}/{pillar.maxWeighted}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${(weightedScores[index] / pillar.maxWeighted) * 100}%`,
                              backgroundColor: '#AE491E'
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-end">
                <div className="text-left">
                  <div className="w-32 h-px bg-gray-400 mb-2"></div>
                  <div className="text-sm font-medium text-gray-700">Director, Nestara Limited</div>
                </div>
                
                <div className="text-right">
                  <div className="w-32 h-px bg-gray-400 mb-2"></div>
                  <div className="text-sm font-medium text-gray-700">Lead Trainer, NICHE</div>
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