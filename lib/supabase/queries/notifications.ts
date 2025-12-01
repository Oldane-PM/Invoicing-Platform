import { supabase } from '../client'
import type { Notification } from '@/types/domain'

/**
 * Create a notification for an employee
 */
export async function createNotification(
  employeeId: string,
  type: Notification['type'],
  title: string,
  message: string,
  submissionId?: string | null
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      employee_id: employeeId,
      type,
      title,
      message,
      submission_id: submissionId || null,
      is_read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }

  return data as Notification
}

/**
 * Get all notifications for an employee
 */
export async function getEmployeeNotifications(employeeId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }

  return data as Notification[]
}

