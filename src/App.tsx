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
import { Vetting } from './pages/Vetting'
import { Staff } from './pages/Staff'
import { LeadTracker } from './pages/LeadTracker'
import { ConvertedClients } from './pages/ConvertedClients'
import { Blacklisted } from './pages/Blacklisted'
import { NestaraAI } from './pages/NestaraAI'
import { CreateProfile } from './pages/CreateProfile'
import { Placements } from './pages/Placements'
import { Calendar } from './pages/Calendar'

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
        <Route index element={<Dashboard />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="vetting" element={<Vetting />} />
        <Route path="clients" element={<Clients />} />
        <Route path="leads" element={<Leads />} />
        <Route path="converted-clients" element={<ConvertedClients />} />
        <Route path="placements" element={<Placements />} />
        <Route path="staff" element={<Staff />} />
        <Route path="blacklisted" element={<Blacklisted />} />
        <Route path="training" element={<TrainingLeads />} />
        <Route path="lead-tracker" element={<LeadTracker />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="insights" element={<Insights />} />
        <Route path="calendar" element={<Calendar />} />
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