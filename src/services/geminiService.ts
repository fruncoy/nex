import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export interface BusinessData {
  clients: any[]
  candidates: any[]
  interviews: any[]
  trainingLeads: any[]
  dateRange: { start: string; end: string }
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  async generateExecutiveSummary(data: BusinessData): Promise<string> {
    const prompt = `
    As a business analyst for Nestara, a domestic staffing agency, analyze the following data and provide a comprehensive executive summary:

    Period: ${data.dateRange.start} to ${data.dateRange.end}

    CLIENTS DATA:
    - Total clients: ${data.clients.length}
    - Won clients: ${data.clients.filter(c => c.status === 'Won').length}
    - Active clients (paid PAF): ${data.clients.filter(c => c.status?.includes('Client -')).length}
    - Lost/Ghosted: ${data.clients.filter(c => c.status === 'Ghosted' || c.status === 'Lost' || c.status === 'Budget' || c.status === 'Competition').length}
    - Client sources: ${this.getSourceBreakdown(data.clients)}
    - Role requests: ${this.getRoleBreakdown(data.clients, 'role_requested')}

    CANDIDATES DATA:
    - Total candidates: ${data.candidates.length}
    - Won candidates: ${data.candidates.filter(c => c.status === 'WON').length}
    - Lost candidates: ${data.candidates.filter(c => c.status === 'LOST').length}
    - Candidate sources: ${this.getSourceBreakdown(data.candidates)}
    - Roles applied: ${this.getRoleBreakdown(data.candidates, 'role')}

    INTERVIEWS DATA:
    - Total interviews: ${data.interviews.length}
    - Attended: ${data.interviews.filter(i => i.attended).length}
    - Success rate: ${data.interviews.length > 0 ? ((data.interviews.filter(i => i.attended).length / data.interviews.length) * 100).toFixed(1) : 0}%

    Provide a 150-200 word executive summary focusing on:
    1. Key performance metrics and conversion rates
    2. Top performing channels and their ROI
    3. Major operational challenges and bottlenecks
    4. Pipeline health and revenue potential
    5. Strategic recommendations for improvement

    Write in a professional, data-driven tone suitable for business stakeholders.
    `

    try {
      const result = await this.model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Gemini API error:', error)
      return this.getFallbackSummary(data)
    }
  }

  async generateClientAnalysis(data: BusinessData): Promise<string> {
    const prompt = `
    Analyze the client acquisition performance for Nestara staffing agency:

    CLIENT METRICS:
    - Total inquiries: ${data.clients.length}
    - Conversion rate: ${data.clients.length > 0 ? ((data.clients.filter(c => c.status === 'Won').length / data.clients.length) * 100).toFixed(1) : 0}%
    - Source performance: ${this.getSourceBreakdown(data.clients)}
    - Status breakdown: ${this.getStatusBreakdown(data.clients)}
    - Role demand: ${this.getRoleBreakdown(data.clients, 'role_requested')}

    Provide insights on:
    1. Channel effectiveness and conversion quality
    2. Client journey bottlenecks
    3. Market demand patterns
    4. Revenue pipeline strength
    5. Actionable recommendations

    Keep it concise (120-150 words) and actionable.
    `

    try {
      const result = await this.model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Gemini API error:', error)
      return this.getFallbackClientAnalysis(data)
    }
  }

  async generateCandidateAnalysis(data: BusinessData): Promise<string> {
    const prompt = `
    Analyze candidate recruitment performance for Nestara:

    CANDIDATE METRICS:
    - Total applications: ${data.candidates.length}
    - Success rate: ${data.candidates.length > 0 ? ((data.candidates.filter(c => c.status === 'WON').length / data.candidates.length) * 100).toFixed(1) : 0}%
    - Source performance: ${this.getSourceBreakdown(data.candidates)}
    - Role distribution: ${this.getRoleBreakdown(data.candidates, 'role')}
    - Interview performance: ${data.interviews.length} interviews, ${data.interviews.filter(i => i.attended).length} attended

    Focus on:
    1. Recruitment channel effectiveness
    2. Quality vs quantity of applications
    3. Interview-to-hire conversion
    4. Skills gap analysis
    5. Talent pipeline optimization

    Provide 120-150 words of actionable insights.
    `

    try {
      const result = await this.model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Gemini API error:', error)
      return this.getFallbackCandidateAnalysis(data)
    }
  }

  private getSourceBreakdown(data: any[]): string {
    const sources = data.reduce((acc, item) => {
      const source = item.source || 'Other'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => `${source}: ${count}`)
      .join(', ')
  }

  private getRoleBreakdown(data: any[], field: string): string {
    const roles = data.reduce((acc, item) => {
      const role = item[field] || 'Other'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(roles)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ')
  }

  private getStatusBreakdown(data: any[]): string {
    const statuses = data.reduce((acc, item) => {
      let status = item.status || 'Unknown'
      if (status.startsWith('Client -')) status = 'Active'
      if (['Lost', 'Budget', 'Ghosted', 'Competition'].includes(status)) status = 'Lost'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(statuses)
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ')
  }

  private getFallbackSummary(data: BusinessData): string {
    const clientWinRate = data.clients.length > 0 ? ((data.clients.filter(c => c.status === 'Won').length / data.clients.length) * 100).toFixed(1) : '0'
    const candidateWinRate = data.candidates.length > 0 ? ((data.candidates.filter(c => c.status === 'WON').length / data.candidates.length) * 100).toFixed(1) : '0'
    
    return `During the reporting period, Nestara processed ${data.clients.length} client inquiries with a ${clientWinRate}% conversion rate and ${data.candidates.length} candidate applications achieving ${candidateWinRate}% success rate. The business demonstrates strong market presence with diversified acquisition channels. Key operational focus areas include optimizing conversion funnels, enhancing candidate quality screening, and improving client engagement strategies to reduce attrition rates.`
  }

  private getFallbackClientAnalysis(data: BusinessData): string {
    return `Client acquisition shows ${data.clients.length} total inquiries with varied source performance. Conversion optimization and lead nurturing processes require enhancement to improve the current win rate. Focus on high-performing channels and streamlined onboarding processes will drive better results.`
  }

  private getFallbackCandidateAnalysis(data: BusinessData): string {
    return `Candidate recruitment processed ${data.candidates.length} applications with ${data.interviews.length} interviews conducted. Quality screening and interview processes show room for improvement. Enhanced sourcing strategies and better candidate experience will strengthen the talent pipeline.`
  }
}

export const geminiService = new GeminiService()