import { supabase } from './supabase'

export interface StatusHistoryEntry {
  id: string
  old_status: string | null
  new_status: string
  changed_by_name: string
  changed_at: string
  days_in_previous_status: number
  notes: string | null
}

export class StatusHistoryLogger {
  static async logStatusChange(
    entityType: 'candidate' | 'client',
    entityId: string,
    entityName: string,
    oldStatus: string | null,
    newStatus: string,
    changedByUserId: string,
    changedByName: string,
    notes?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_status_change', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_entity_name: entityName,
        p_old_status: oldStatus,
        p_new_status: newStatus,
        p_changed_by_user_id: changedByUserId,
        p_changed_by_name: changedByName,
        p_notes: notes || null
      })

      if (error) {
        console.error('Error logging status change:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in logStatusChange:', error)
      return null
    }
  }

  static async getStatusHistory(
    entityType: 'candidate' | 'client',
    entityId: string
  ): Promise<StatusHistoryEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_status_history', {
        p_entity_type: entityType,
        p_entity_id: entityId
      })

      if (error) {
        console.error('Error getting status history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getStatusHistory:', error)
      return []
    }
  }
}