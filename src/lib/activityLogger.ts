import { supabase } from './supabase'

interface ActivityLogParams {
  userId: string
  actionType: 'status_change' | 'edit' | 'create' | 'delete' | 'reschedule' | 'bulk_upload'
  entityType?: 'candidate' | 'client' | 'training_lead' | 'interview' | 'meeting_note' | 'niche_training' | 'niche_fees'
  entityId?: string
  entityName?: string
  oldValue?: string
  newValue?: string
  description: string
}

export class ActivityLogger {
  static async log({
    userId,
    actionType,
    entityType,
    entityId,
    entityName,
    oldValue,
    newValue,
    description
  }: ActivityLogParams) {
    try {
      // Get staff info for user_id
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('id', userId)
        .single()

      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: staffData?.id || userId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          old_value: oldValue,
          new_value: newValue,
          description
        })

      if (error) {
        console.error('Failed to log activity:', error)
      }
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  // Helper methods for common activities
  static async logStatusChange(
    userId: string,
    entityType: 'candidate' | 'client' | 'training_lead',
    entityId: string,
    entityName: string,
    oldStatus: string,
    newStatus: string,
    userName: string
  ) {
    const entityTypeDisplay = entityType === 'candidate' ? 'candidate' : 
                             entityType === 'client' ? 'client' : 'training lead'
    
    await this.log({
      userId,
      actionType: 'status_change',
      entityType,
      entityId,
      entityName,
      oldValue: oldStatus,
      newValue: newStatus,
      description: `${userName} changed ${entityName} status from ${oldStatus} to ${newStatus}`
    })
  }

  static async logEdit(
    userId: string,
    entityType: 'candidate' | 'client' | 'training_lead' | 'meeting_note' | 'niche_training' | 'niche_fees',
    entityId: string,
    entityName: string,
    userName: string
  ) {
    const entityTypeDisplay = entityType === 'candidate' ? 'candidate' : 
                             entityType === 'client' ? 'client' : 
                             entityType === 'meeting_note' ? 'meeting note' : 'training lead'
    
    await this.log({
      userId,
      actionType: 'edit',
      entityType,
      entityId,
      entityName,
      description: `${userName} updated ${entityName} (${entityTypeDisplay}) profile`
    })
  }

  static async logCreate(
    userId: string,
    entityType: 'candidate' | 'client' | 'training_lead' | 'meeting_note' | 'niche_training' | 'niche_fees',
    entityId: string,
    entityName: string,
    userName: string
  ) {
    const entityTypeDisplay = entityType === 'candidate' ? 'Candidate' : 
                             entityType === 'client' ? 'Client' : 
                             entityType === 'meeting_note' ? 'Meeting Note' : 'Training Lead'
    
    await this.log({
      userId,
      actionType: 'create',
      entityType,
      entityId,
      entityName,
      description: `${userName} added new ${entityTypeDisplay}: ${entityName}`
    })
  }

  static async logReschedule(
    userId: string,
    entityType: 'interview',
    entityId: string,
    entityName: string,
    oldDateTime: string,
    newDateTime: string,
    userName: string
  ) {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.toLocaleString('default', { month: 'short' })
      const year = date.getFullYear()
      const dayOfWeek = date.toLocaleString('default', { weekday: 'short' })
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                     day === 2 || day === 22 ? 'nd' :
                     day === 3 || day === 23 ? 'rd' : 'th'
      return `${dayOfWeek} ${day}${suffix} ${month} ${year}`
    }
    
    await this.log({
      userId,
      actionType: 'reschedule',
      entityType,
      entityId,
      entityName,
      oldValue: formatDate(oldDateTime),
      newValue: formatDate(newDateTime),
      description: `${userName} rescheduled ${entityName}'s interview from ${formatDate(oldDateTime)} to ${formatDate(newDateTime)}`
    })
  }

  static async logBulkUpload(
    userId: string,
    entityType: 'candidate' | 'client',
    count: number,
    userName: string
  ) {
    const entityTypeDisplay = entityType === 'candidate' ? 'candidates' : 'clients'
    
    await this.log({
      userId,
      actionType: 'bulk_upload',
      entityType,
      description: `${userName} uploaded ${count} ${entityTypeDisplay} in bulk`
    })
  }
}