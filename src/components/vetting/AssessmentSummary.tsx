import React from 'react'
import { Award, TrendingUp, AlertTriangle } from 'lucide-react'

interface SummaryProps {
  pillars: Array<{
    id: string
    name: string
    pillar_weight: number
    score: number
    category: string
  }>
  overallScore: number
  aggregateScore: number
  onboardRecommendation: boolean
  hasCriticalFailures: boolean
}

export function AssessmentSummary({ 
  pillars, 
  overallScore, 
  aggregateScore, 
  onboardRecommendation,
  hasCriticalFailures 
}: SummaryProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Advanced': return 'text-green-600 bg-green-100'
      case 'Intermediate': return 'text-blue-600 bg-blue-100'
      default: return 'text-amber-600 bg-amber-100'
    }
  }

  const topPillars = pillars
    .filter(p => p.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  const lowestPillar = pillars.reduce((lowest, current) => 
    current.score < lowest.score ? current : lowest
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Assessment Summary</h3>
      
      {/* Overall Score */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">Overall Performance</h4>
            <p className="text-sm text-gray-600">Weighted across all pillars</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-nestalk-primary">
              {overallScore.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              ({aggregateScore.toFixed(1)}/5)
            </div>
          </div>
        </div>
      </div>

      {/* Onboard Recommendation */}
      <div className={`mb-6 p-4 rounded-lg border ${
        onboardRecommendation && !hasCriticalFailures
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center">
          {onboardRecommendation && !hasCriticalFailures ? (
            <Award className="w-5 h-5 text-green-600 mr-2" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          )}
          <div>
            <h4 className={`font-medium ${
              onboardRecommendation && !hasCriticalFailures
                ? 'text-green-800'
                : 'text-red-800'
            }`}>
              {onboardRecommendation && !hasCriticalFailures
                ? 'Recommended for Onboarding'
                : 'Not Recommended for Onboarding'
              }
            </h4>
            <p className={`text-sm ${
              onboardRecommendation && !hasCriticalFailures
                ? 'text-green-700'
                : 'text-red-700'
            }`}>
              {hasCriticalFailures
                ? 'Critical failures detected'
                : overallScore < 70
                ? 'Overall score below 70% threshold'
                : 'Meets all requirements'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Pillar Breakdown */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-4">Pillar Performance</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-medium text-gray-700">Pillar</th>
                <th className="text-right py-2 text-sm font-medium text-gray-700">Score</th>
                <th className="text-right py-2 text-sm font-medium text-gray-700">Weight</th>
                <th className="text-right py-2 text-sm font-medium text-gray-700">Category</th>
                <th className="text-right py-2 text-sm font-medium text-gray-700">Badge</th>
              </tr>
            </thead>
            <tbody>
              {pillars.map(pillar => (
                <tr key={pillar.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-900">{pillar.name}</td>
                  <td className="py-3 text-sm text-right font-medium">
                    {pillar.score.toFixed(1)}%
                  </td>
                  <td className="py-3 text-sm text-right text-gray-600">
                    {(pillar.pillar_weight * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(pillar.category)}`}>
                      {pillar.category}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {pillar.score >= 80 && (
                      <Award className="w-4 h-4 text-yellow-500 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Key Strengths</h4>
          {topPillars.length > 0 ? (
            <ul className="text-sm text-gray-600 space-y-1">
              {topPillars.map(pillar => (
                <li key={pillar.id} className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                  {pillar.name} ({pillar.score.toFixed(1)}%)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No pillars scored above 80%</p>
          )}
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Development Needed</h4>
          <div className="flex items-center text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
            {lowestPillar.name} ({lowestPillar.score.toFixed(1)}%)
          </div>
        </div>
      </div>
    </div>
  )
}