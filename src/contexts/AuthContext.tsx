import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  staff: any | null
  staffList: any[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState<any | null>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('Loading staff data for user:', session.user.id)
        loadStaffData(session.user.id) // Don't log login on initial session check
        loadAllStaff()
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadStaffData(session.user.id) // Only log login for actual sign-in events
        loadAllStaff()
      } else {
        // No logout logging needed
        setStaff(null)
        setStaffList([])
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadStaffData = async (userId: string) => {
    try {
      console.log('Loading staff data for user ID:', userId)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', userId)
        .single()
      
      console.log('Staff data result:', { data, error })
      if (!error && data) {
        setStaff(data)
        console.log('Staff data loaded:', data)
      } else {
        console.log('No staff data found or error:', error)
      }
    } catch (error) {
      console.error('Error loading staff data:', error)
    }
  }

  const loadAllStaff = async () => {
    try {
      console.log('Loading all staff data')
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')
      
      console.log('All staff data result:', { data, error })
      if (!error && data) {
        setStaffList(data)
        console.log('All staff data loaded:', data)
      } else {
        console.log('No staff data found or error:', error)
      }
    } catch (error) {
      console.error('Error loading all staff data:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setStaff(null)
    setStaffList([])
  }

  const value = {
    user,
    session,
    staff,
    staffList,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}