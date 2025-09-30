import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { LoginForm } from './components/auth/LoginForm'
import { Dashboard } from './pages/Dashboard'
import { Candidates } from './pages/Candidates'
import { Clients } from './pages/Clients'
import { TrainingLeads } from './pages/TrainingLeads'
import { Interviews } from './pages/Interviews'
import { Updates } from './pages/Updates'
import { MeetingNotes } from './pages/MeetingNotes'
import { Reporting } from './pages/Reporting'
import { DataEntry } from './pages/reporting/DataEntry'
import { Reports } from './pages/reporting/Reports'
import { Dashboards } from './pages/reporting/Dashboards'

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
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="candidates" element={<Candidates />}>
          <Route path="interviews" element={<Interviews />} />
        </Route>
        <Route path="clients" element={<Clients />} />
        <Route path="training" element={<TrainingLeads />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="updates" element={<Updates />} />
        <Route path="meeting-notes" element={<MeetingNotes />} />
        <Route path="reporting" element={<Reporting />}>
          <Route index element={<DataEntry />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="reports" element={<Reports />} />
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