import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { FileText, Download, X } from 'lucide-react'

interface GradingReportProps {
  onClose: () => void
}

const GradingReport: React.FC<GradingReportProps> = ({ onClose }) => {
  const [cohorts, setCohorts] = useState<any[]>([])
  const [selectedCohort, setSelectedCohort] = useState<string>('all')
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

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

  useEffect(() => {
    loadCohorts()
  }, [])

  useEffect(() => {
    loadReportData()
  }, [selectedCohort])

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('niche_cohorts')
        .select('*')
        .order('cohort_number', { ascending: true })

      if (error) throw error
      setCohorts(data || [])
    } catch (error) {
      console.error('Error loading cohorts:', error)
    }
  }

  const loadReportData = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('trainee_grades')
        .select(`
          *,
          niche_training!inner(name, role, course, cohort_id),
          niche_cohorts!inner(cohort_number, start_date, end_date)
        `)

      if (selectedCohort !== 'all') {
        query = query.eq('cohort_id', selectedCohort)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Sort by cohort number after fetching
      const sortedData = (data || []).sort((a, b) => 
        a.niche_cohorts.cohort_number - b.niche_cohorts.cohort_number
      )
      
      setReportData(sortedData)
    } catch (error) {
      console.error('Error loading report data:', error)
      showToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getRomanNumeral = (num: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    return romanNumerals[num] || num.toString()
  }

  const exportToPDF = () => {
    const printContent = document.getElementById('grading-report')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NICHE Grading Report</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; margin: 0; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #AE491E; padding-bottom: 15px; }
            .header h1 { font-size: 28px; margin: 0; color: #AE491E; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 10px; }
            th { background: linear-gradient(135deg, #AE491E, #8B3A18); color: white; font-weight: bold; }
            .cohort-section { margin-bottom: 30px; }
            .cohort-title { font-size: 16px; font-weight: bold; margin: 15px 0 8px 0; color: #AE491E; text-align: center; border-bottom: 2px solid #AE491E; padding-bottom: 8px; }
            .tier-master { color: #7c3aed; font-weight: bold; }
            .tier-distinguished { color: #2563eb; font-weight: bold; }
            .tier-exceptional { color: #059669; font-weight: bold; }
            .tier-excellent { color: #d97706; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            tr:hover { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const groupedData = reportData.reduce((acc, record) => {
    const cohortNumber = record.niche_cohorts.cohort_number
    if (!acc[cohortNumber]) {
      acc[cohortNumber] = {
        cohort: record.niche_cohorts,
        records: []
      }
    }
    acc[cohortNumber].records.push(record)
    return acc
  }, {} as Record<number, { cohort: any; records: any[] }>)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6" style={{background: 'linear-gradient(135deg, #AE491E, #8B3A18)'}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">NICHE Grading Report</h2>
              <p className="text-orange-100">Official Academic Performance Report</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToPDF}
                className="bg-white px-4 py-2 rounded-lg hover:bg-orange-50 flex items-center gap-2 font-semibold transition-colors"
                style={{color: '#AE491E'}}
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-orange-200 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-gray-50 border-b p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Cohort:</label>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:border-orange-500"
              style={{'--tw-ring-color': '#AE491E', 'borderColor': selectedCohort !== 'all' ? '#AE491E' : undefined}}
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

        {/* Report Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <div id="grading-report">
            <div className="header">
              <h1>Nestara Institute of Care and Hospitality Excellence</h1>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: '#AE491E'}}></div>
                <span className="ml-3 text-gray-600">Loading report data...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.keys(groupedData).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-500">No graded trainees found for the selected criteria.</p>
                  </div>
                ) : (
                  Object.keys(groupedData).map(cohortNumber => {
                    const cohortData = groupedData[parseInt(cohortNumber)]
                    return (
                      <div key={cohortNumber} className="cohort-section">
                        <div className="cohort-title" style={{color: '#AE491E', borderLeftColor: '#AE491E'}}>
                          Cohort {getRomanNumeral(parseInt(cohortNumber))} - 
                          {new Date(cohortData.cohort.start_date).toLocaleDateString()} to {new Date(cohortData.cohort.end_date).toLocaleDateString()}
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-white" style={{background: 'linear-gradient(135deg, #AE491E, #8B3A18)'}}>
                                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">#</th>
                                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Training Type</th>
                                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Course</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Pillar 1</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Pillar 2</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Pillar 3</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Pillar 4</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Final Score</th>
                                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider">Tier</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {cohortData.records.map((record, index) => {
                                const pillars = record.training_type === 'nanny' ? nannyPillars : houseManagerPillars
                                const getTierClass = (tier: string) => {
                                  switch (tier) {
                                    case 'MASTER': return 'tier-master bg-purple-50'
                                    case 'DISTINGUISHED': return 'tier-distinguished bg-blue-50'
                                    case 'EXCEPTIONAL': return 'tier-exceptional bg-green-50'
                                    case 'EXCELLENT': return 'tier-excellent bg-yellow-50'
                                    default: return 'text-gray-600 bg-gray-50'
                                  }
                                }
                                
                                return (
                                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.niche_training.name}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        record.training_type === 'nanny' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                      }`}>
                                        {record.training_type === 'nanny' ? 'Nanny' : 'House Manager'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">{record.niche_training.course}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">{record.pillar1_weighted?.toFixed(1)}/{pillars[0].maxWeighted}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">{record.pillar2_weighted?.toFixed(1)}/{pillars[1].maxWeighted}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">{record.pillar3_weighted?.toFixed(1)}/{pillars[2].maxWeighted}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">{record.pillar4_weighted?.toFixed(1)}/{pillars[3].maxWeighted}</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold" style={{color: '#AE491E'}}>{record.final_score?.toFixed(1)}%</td>
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getTierClass(record.tier)}`}>
                                        {record.tier}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GradingReport