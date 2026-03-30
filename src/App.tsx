import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { LoginForm } from './components/auth/LoginForm'
import { NicheCandidates } from './pages/NicheCandidates'
import { NicheInterviews } from './pages/NicheInterviews'
import { Updates } from './pages/Updates'
import { Reminders } from './pages/Reminders'
import { MeetingNotes } from './pages/MeetingNotes'
import { Niche } from './pages/Niche'
import { NicheCourses } from './pages/NicheCourses'
import { NicheTraining } from './pages/NicheTraining'
import { NicheFees } from './pages/NicheFees'
import { NicheTimetable } from './pages/NicheTimetable'
import { NicheCohorts } from './pages/NicheCohorts'
import { NicheGrading } from './pages/NicheGrading'
import { Blacklisted } from './pages/Blacklisted'
import { SMSManagement } from './pages/SMSManagement'
import { NestaraAI } from './pages/NestaraAI'
import { CreateProfile } from './pages/CreateProfile'
import { Calendar } from './pages/Calendar'
import { GetMatch } from './pages/GetMatch'
import NicheProgressTracking from './pages/NicheProgressTracking'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  console.log('ProtectedLayout - user:', user, 'loading:', loading)

  if (loading) {
    console.log('ProtectedLayout - showing loading spinner')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-nestalk-primary"></div>
      </div>
    )
  }

  if (!user) {
    console.log('ProtectedLayout - no user, showing login')
    return <LoginForm />
  }

  console.log('ProtectedLayout - user authenticated, showing layout with outlet')
  return <Layout />
}

function AppRoutes() {
  console.log('AppRoutes rendering')
  return (
    <Routes>
      <Route path="/createprofile" element={<CreateProfile />} />
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Niche />} />
        <Route path="niche-candidates" element={<NicheCandidates />} />
        <Route path="niche-interviews" element={<NicheInterviews />} />
        <Route path="niche" element={<Niche />} />
        <Route path="niche-courses" element={<NicheCourses />} />
        <Route path="niche-cohorts" element={<NicheCohorts />} />
        <Route path="niche-training" element={<NicheTraining />} />
        <Route path="niche-fees" element={<NicheFees />} />
        <Route path="niche-timetable" element={<NicheTimetable />} />
        <Route path="niche-grading" element={<NicheGrading />} />
        <Route path="niche-progress" element={<NicheProgressTracking />} />
        <Route path="get-match" element={<GetMatch />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="sms" element={<SMSManagement />} />
        <Route path="nestara-ai" element={<NestaraAI />} />
        <Route path="updates" element={<Updates />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="meeting-notes" element={<MeetingNotes />} />
        <Route path="blacklisted" element={<Blacklisted />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </Router>
    </AuthProvider>
  )
}

export default App