import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface WrappedStats {
  totalCandidates: number
  totalLeads: number
  totalClients: number
  totalInterviews: number
  totalPlacements: number
  busiestMonth: { month: string; count: number }
  topSource: { source: string; wins: number }
  blacklistedCount: number
  teamStats: {
    totalMembers: number
    mostActive: { name: string; activities: number }
    signupDates: string[]
  }
  // Exam Room metrics
  wonCandidates: number
  lostClients: number
  qualifiedCandidates: number
  activePlacements: number
  refundedClients: number
  interviewWon: number
  totalOutcomes: number
  totalPlacements: number
  candidatesWithInterviews: number
}

export function Wrapped2025() {
  const { staff, user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentCard, setCurrentCard] = useState(0)
  const navigate = useNavigate()

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  useEffect(() => {
    loadWrappedStats()
  }, [])

  const handleNextCard = () => {
    if (currentCard === 0) {
      const audio = new Audio('/src/assets/taan.wav')
      audio.play().catch(error => {
        console.log('Audio play blocked:', error)
      })
    }
    setCurrentCard(currentCard + 1)
  }

  const loadWrappedStats = async () => {
    try {
      // Get all data for 2025
      const year2025Start = '2025-01-01'
      const year2025End = '2025-12-31'

      // Total candidates
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)

      // Total leads (clients with Pending/Lost status)
      const { data: leadsData } = await supabase
        .from('clients')
        .select('status')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)
      
      const leadsCount = leadsData?.filter(client => 
        client.status.includes('Pending') || client.status.includes('Lost')
      ).length || 0

      // Total clients (clients with Active/Won status)
      const clientsCount = leadsData?.filter(client => 
        client.status.includes('Active') || 
        client.status === 'Won' || 
        client.status.includes('Reviewing') || 
        client.status.includes('Profile') || 
        client.status.includes('Conducting') || 
        client.status.includes('Payment')
      ).length || 0

      // Total interviews
      const { count: interviewsCount } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)

      // Total placements (Won clients)
      const placementsCount = leadsData?.filter(client => client.status === 'Won').length || 0

      // Additional metrics for Exam Room
      const { data: candidatesData } = await supabase
        .from('candidates')
        .select('status')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)
      
      const wonCandidates = candidatesData?.filter(c => c.status === 'WON').length || 0
      const lostClients = leadsData?.filter(c => c.status.includes('Lost')).length || 0
      
      // Interview conversion: candidates who got interviews and won / total interviews
      const candidatesWithInterviews = candidatesData?.filter(c => 
        c.status === 'INTERVIEW_SCHEDULED' || c.status === 'WON' || c.status.startsWith('Lost')
      ).length || 0
      
      // Qualified candidates = won candidates (since they're the ones who made it)
      const qualifiedCandidates = wonCandidates
      
      // Get placement data from placements table
      const { data: placementsData } = await supabase
        .from('placements')
        .select('status')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)
      
      // Get clients with placement_status for refund calculations
      const { data: clientsWithPlacement } = await supabase
        .from('clients')
        .select('status, placement_status')
        .eq('status', 'Won')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)
      
      // Total placements = Won clients
      const totalPlacements = clientsWithPlacement?.length || 0
      
      // Active placements = placements with ACTIVE status OR clients without refund status
      const activePlacementsFromTable = placementsData?.filter(p => p.status === 'ACTIVE').length || 0
      const activeFromClients = clientsWithPlacement?.filter(c => 
        !c.placement_status || c.placement_status === 'Active'
      ).length || 0
      const activePlacements = Math.max(activePlacementsFromTable, activeFromClients)
      
      // Refunded clients = clients with refund-related placement_status
      const refundedClients = clientsWithPlacement?.filter(c => 
        c.placement_status === 'Refunded' || c.placement_status === 'Lost (Refunded)'
      ).length || 0
      
      // Interview conversion: interviews won / total interviews
      const { data: interviewsWithOutcome } = await supabase
        .from('interviews')
        .select('outcome')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)
      
      const interviewWon = interviewsWithOutcome?.filter(i => i.outcome === 'Interview_Won').length || 0
      const totalOutcomes = wonCandidates + lostClients + placementsCount + (candidatesData?.filter(c => c.status.startsWith('Lost')).length || 0)

      // Busiest month
      const { data: monthlyData } = await supabase
        .from('candidates')
        .select('created_at')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)

      const monthCounts: { [key: string]: number } = {}
      monthlyData?.forEach(item => {
        const month = new Date(item.created_at).toLocaleString('default', { month: 'long' })
        monthCounts[month] = (monthCounts[month] || 0) + 1
      })

      const busiestMonth = Object.entries(monthCounts).reduce(
        (max, [month, count]) => count > max.count ? { month, count } : max,
        { month: 'January', count: 0 }
      )

      // Top source with most wins
      const wonClients = leadsData?.filter(client => client.status === 'Won') || []
      const { data: wonClientsWithSource } = await supabase
        .from('clients')
        .select('source')
        .eq('status', 'Won')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)

      const sourceCounts: { [key: string]: number } = {}
      wonClientsWithSource?.forEach(item => {
        if (item.source) {
          sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1
        }
      })

      const topSource = Object.entries(sourceCounts).reduce(
        (max, [source, wins]) => wins > max.wins ? { source, wins } : max,
        { source: 'Direct', wins: 0 }
      )

      // Blacklisted candidates
      const { count: blacklistedCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .ilike('status', '%blacklist%')

      // Team stats
      const { data: teamData } = await supabase
        .from('staff')
        .select('*')

      const { data: updatesData } = await supabase
        .from('updates')
        .select('user_id')
        .gte('created_at', year2025Start)
        .lte('created_at', year2025End)

      const userActivityCounts: { [key: string]: number } = {}
      updatesData?.forEach(update => {
        userActivityCounts[update.user_id] = (userActivityCounts[update.user_id] || 0) + 1
      })

      const mostActiveUserId = Object.entries(userActivityCounts).reduce(
        (max, [userId, count]) => count > max.count ? { userId, count } : max,
        { userId: '', count: 0 }
      )

      const mostActiveUser = teamData?.find(member => member.id === mostActiveUserId.userId)

      setStats({
        totalCandidates: candidatesCount || 0,
        totalLeads: leadsCount,
        totalClients: clientsCount,
        totalInterviews: interviewsCount || 0,
        totalPlacements: placementsCount,
        busiestMonth,
        topSource,
        blacklistedCount: blacklistedCount || 0,
        teamStats: {
          totalMembers: teamData?.length || 0,
          mostActive: {
            name: mostActiveUser?.name || 'No activity yet',
            activities: mostActiveUserId.count
          },
          signupDates: teamData?.map(member => member.created_at) || []
        },
        // Exam Room metrics
        wonCandidates,
        lostClients,
        qualifiedCandidates,
        activePlacements,
        refundedClients,
        interviewWon,
        totalOutcomes,
        totalPlacements,
        candidatesWithInterviews
      })
    } catch (error) {
      console.error('Error loading wrapped stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: "Nex 2025 Wrapped",
      content: (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Salutations, {staff?.name?.split(' ')[0] || 'First Name'}
          </h2>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            Subsequent to the culmination of the annum 2025, and with the commencement of this nascent chronological cycle, it is incumbent upon us to meticulously evaluate the trajectory of our endeavors.
          </p>
          <div className="text-6xl mb-4">🎉</div>
        </div>
      )
    },
    {
      title: "Talent Census",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {stats?.totalCandidates || 0}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            We had three hundred plus distinct individuals on the radar. That's not a small number, si unaona? It is the total population of our future rockstars, the ones who helped us avoid those late-night calls.
          </p>
        </div>
      )
    },
    {
      title: "Wallet Wellness Check",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {(stats?.totalLeads || 0) + (stats?.totalClients || 0)}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            The {stats?.totalPlacements || 0} won clients are the ones who actually key in the paybill number every month. They are our daily bread, the reason we haven't sent a "please help a brother" text. The other leads? Those are the promising customers we hoped they will stop ignoring our calls, but wue!
          </p>
        </div>
      )
    },
    {
      title: "Department of Deep Conversation",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {stats?.totalInterviews || 0}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            We conducted {stats?.totalInterviews || 0} official interviews last year. This number proves our team was working harder than a bolt rider in the rain, navigating traffic, managing expectations, and still making sure everyone was comfortable enough to talk about their salo expectations.
          </p>
        </div>
      )
    },
    {
      title: "The Starting Eleven",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {stats?.teamStats.totalMembers || 0}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            They are the heroes who were always the last ones to leave the office dispenser on. If you ever wondered who managed to track {stats?.totalCandidates || 0} candidates and {(stats?.totalLeads || 0) + (stats?.totalClients || 0)} leads without getting frustrated? It was these {stats?.teamStats.totalMembers || 0} people. They deserve a proper 'tea' for their resilience!
          </p>
        </div>
      )
    },
    {
      title: "The Month That Nearly Broke Us",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {stats?.busiestMonth.month}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            {stats?.busiestMonth.month} was officially the month of maximum effort for minimum immediate return. We had serious placement cases, managed a record number of interviews, and chased leads that only gave us promises, high activity, low money. It was the true litmus test, and we came out colorless!
          </p>
        </div>
      )
    },
    {
      title: "The Hall of Shame",
      content: (
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-600 mb-4">
            {stats?.blacklistedCount || 0}
          </div>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            This is the number of individuals whose professional journey with us had to end abruptly, they were shown the door. However, the data confirms it could have been much higher! Our very own Purity demonstrated the mercy of a saint, saving many from the dreaded 'Never Call Again' list.
          </p>
        </div>
      )
    },
    {
      title: "Exam Room",
      content: (
        <div className="text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-4xl mx-auto">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalCandidates > 0 ? (stats.wonCandidates / stats.totalCandidates) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Candidates Win Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalClients > 0 ? (stats.totalPlacements / stats.totalClients) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Client Win Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalLeads > 0 ? (stats.totalClients / stats.totalLeads) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Client Conversion</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalInterviews > 0 ? (stats.interviewWon / stats.totalInterviews) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Interview Conversion</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalCandidates > 0 ? (stats.qualifiedCandidates / stats.totalCandidates) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Qualification Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalPlacements > 0 ? (stats.activePlacements / stats.totalPlacements) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Placement Success</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalOutcomes > 0 ? ((stats.totalPlacements + stats.wonCandidates) / stats.totalOutcomes) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Overall Win Rate</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 md:p-4 rounded-xl shadow-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">
                {stats ? Math.round((stats.totalPlacements > 0 ? (stats.refundedClients / stats.totalPlacements) * 100 : 0)) : 0}%
              </div>
              <div className="text-xs md:text-sm text-gray-600">Refund Rate</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Tusidanganyane",
      content: (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            2026 Ni Yetu
          </h2>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto">
            Now that we have seen the numbers, we know what is possible. Forget all the wahala of last year, we have the lessons, we have the team, and we have the system. 2026 is officially our year!
          </p>
          <div className="text-6xl mb-4">🎊</div>
        </div>
      )
    },
    {
      title: "Nex is getting a major upgrade!",
      content: (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            2026 Innovations
          </h2>
          <p className="text-base text-gray-500 leading-relaxed max-w-md mx-auto mb-6">
            Soon, the system will be smarter than the smartest person in the room, Purity. Expect AI automation, email reminders, and lightning-fast scan features. Massive shout-out to me, Frank, for the Wrapped! "mniekee za kabej january ni mbaya pesa ilishia kwa birthday" And to the whole team, asante sana.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Let's conquer 2026!
          </button>
        </div>
      )
    },
  ]

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto relative overflow-hidden">
          {/* Left chevron - desktop only */}
          {currentCard > 0 && (
            <button
              onClick={() => setCurrentCard(currentCard - 1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-3 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-colors z-20 hidden sm:block"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* Right chevron - desktop only */}
          {currentCard < cards.length - 1 && (
            <button
              onClick={handleNextCard}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-colors z-20 hidden sm:block"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          
          {/* Cards Container */}
          <div 
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentCard * 100}%)` }}
            onTouchStart={(e) => {
              const touch = e.touches[0]
              e.currentTarget.dataset.startX = touch.clientX.toString()
            }}
            onTouchEnd={(e) => {
              const startX = parseFloat(e.currentTarget.dataset.startX || '0')
              const endX = e.changedTouches[0].clientX
              const diff = startX - endX
              
              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentCard < cards.length - 1) {
                  handleNextCard()
                } else if (diff < 0 && currentCard > 0) {
                  setCurrentCard(currentCard - 1)
                }
              }
            }}
          >
            {cards.map((card, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px] flex flex-col justify-center relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-50 to-orange-100 rounded-full translate-y-12 -translate-x-12 opacity-30"></div>
                  
                  <div className="flex flex-col items-center justify-center h-full relative z-10">
                    <h1 className="text-2xl font-bold text-orange-600 mb-6">
                      {card.title}
                    </h1>
                    {card.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              {cards.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentCard ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}