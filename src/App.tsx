import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { LoginForm } from './components/auth/LoginForm'
import { Dashboard } from './pages/Dashboard'
import { Candidates } from './pages/Candidates'
import { Leads } from './pages/Leads'
import { Clients } from './pages/Clients'
import { TrainingLeads } from './pages/TrainingLeads'
import { Interviews } from './pages/Interviews'
import { Updates } from './pages/Updates'
import { Reminders } from './pages/Reminders'
import { MeetingNotes } from './pages/MeetingNotes'
import { Reporting } from './pages/Reporting'
import { DataEntry } from './pages/reporting/DataEntry'
import { Reports as ReportingReports } from './pages/reporting/Reports'
import { Reports } from './pages/Reports'
import { Dashboards } from './pages/reporting/Dashboards'
import { Insights } from './pages/Insights'
import { Niche } from './pages/Niche'
import { NicheCourses } from './pages/NicheCourses'
import { NicheTraining } from './pages/NicheTraining'
import { Vetting } from './pages/Vetting'
import { Staff } from './pages/Staff'
import { LeadTracker } from './pages/LeadTracker'
import { ConvertedClients } from './pages/ConvertedClients'
import { Blacklisted } from './pages/Blacklisted'
import { SMSManagement } from './pages/SMSManagement'
import { NestaraAI } from './pages/NestaraAI'
import { CreateProfile } from './pages/CreateProfile'
import { Placements } from './pages/Placements'
import { Calendar } from './pages/Calendar'
import { Wrapped2025 } from './pages/Wrapped2025'

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
      <Route path="/wrapped" element={<Wrapped2025 />} />
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="niche" element={<Niche />} />
        <Route path="niche-courses" element={<NicheCourses />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="niche-training" element={<NicheTraining />} />
        <Route path="insights" element={<Insights />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="sms" element={<SMSManagement />} />
        <Route path="nestara-ai" element={<NestaraAI />} />
        <Route path="updates" element={<Updates />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="meeting-notes" element={<MeetingNotes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reporting" element={<Reporting />}>
          <Route index element={<DataEntry />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="reports" element={<ReportingReports />} />
          <Route path="dashboards" element={<Dashboards />} />
        </Route>
        <Route path="staff" element={<Staff />} />
        <Route path="blacklisted" element={<Blacklisted />} />
        <Route path="vetting" element={<Vetting />} />
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