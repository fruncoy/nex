import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  throw new Error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
}

console.log('Supabase Config:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING'
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string
          name: string
          username: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          username: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          username?: string
          email?: string
          role?: string
          created_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          name: string
          phone: string
          source: string
          role: string
          inquiry_date: string
          status: string
          scheduled_date: string | null
          assigned_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          source: string
          role?: string
          inquiry_date?: string
          status?: string
          scheduled_date?: string | null
          assigned_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          source?: string
          role?: string
          inquiry_date?: string
          status?: string
          scheduled_date?: string | null
          assigned_to?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          phone: string
          gmail: string
          source: string
          want_to_hire: string
          status: string
          inquiry_date: string
          custom_reminder_datetime: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          gmail: string
          source: string
          want_to_hire: string
          status?: string
          inquiry_date?: string
          custom_reminder_datetime?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          gmail?: string
          source?: string
          want_to_hire?: string
          status?: string
          inquiry_date?: string
          custom_reminder_datetime?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      training_leads: {
        Row: {
          id: string
          name: string
          phone: string
          training_type: string
          inquiry_date: string
          status: string
          reminder_date: string | null
          assigned_to: string | null
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          training_type: string
          inquiry_date?: string
          status?: string
          reminder_date?: string | null
          assigned_to?: string | null
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          training_type?: string
          inquiry_date?: string
          status?: string
          reminder_date?: string | null
          assigned_to?: string | null
          notes?: string
          created_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          candidate_id: string
          date_time: string
          location: string
          assigned_staff: string | null
          attended: boolean
          outcome: string | null
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          date_time: string
          location: string
          assigned_staff?: string | null
          attended?: boolean
          outcome?: string | null
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          date_time?: string
          location?: string
          assigned_staff?: string | null
          attended?: boolean
          outcome?: string | null
          notes?: string
          created_at?: string
        }
      }
      updates: {
        Row: {
          id: string
          linked_to_type: string
          linked_to_id: string
          user_id: string
          update_text: string
          reminder_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          linked_to_type: string
          linked_to_id: string
          user_id: string
          update_text: string
          reminder_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          linked_to_type?: string
          linked_to_id?: string
          user_id?: string
          update_text?: string
          reminder_date?: string | null
          created_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          linked_to_type: string
          linked_to_id: string
          user_id: string
          description: string
          follow_up_assigned_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          linked_to_type: string
          linked_to_id: string
          user_id: string
          description: string
          follow_up_assigned_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          linked_to_type?: string
          linked_to_id?: string
          user_id?: string
          description?: string
          follow_up_assigned_to?: string | null
          created_at?: string
        }
      }
      meeting_notes: {
        Row: {
          id: string
          title: string
          meeting_date: string
          notes: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          meeting_date?: string
          notes: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          meeting_date?: string
          notes?: string
          created_by?: string
          created_at?: string
        }
      }
      deliverables: {
        Row: {
          id: string
          meeting_note_id: string
          task_description: string
          assigned_to: string
          status: string
          due_date: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meeting_note_id: string
          task_description: string
          assigned_to: string
          status?: string
          due_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meeting_note_id?: string
          task_description?: string
          assigned_to?: string
          status?: string
          due_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
        }
      }
      kpi_targets: {
        Row: {
          id: string
          role: string
          kpi_name: string
          target_value: number
          unit: string
          is_inverse: boolean
          requires_event_date: boolean
          created_at: string
        }
        Insert: {
          id?: string
          role: string
          kpi_name: string
          target_value: number
          unit: string
          is_inverse?: boolean
          requires_event_date?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          kpi_name?: string
          target_value?: number
          unit?: string
          is_inverse?: boolean
          requires_event_date?: boolean
          created_at?: string
        }
      }
      kpi_records: {
        Row: {
          id: string
          role: string
          kpi_name: string
          actual_value: number
          comments: string | null
          variance: number
          rag_status: string
          recorded_at: string
          actual_event_date: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          role: string
          kpi_name: string
          actual_value: number
          comments?: string | null
          variance: number
          rag_status: string
          recorded_at?: string
          actual_event_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          kpi_name?: string
          actual_value?: number
          comments?: string | null
          variance?: number
          rag_status?: string
          recorded_at?: string
          actual_event_date?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
  }
}