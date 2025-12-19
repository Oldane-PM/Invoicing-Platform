/**
 * Data Access Layer: Notifications
 * 
 * All notification-related database operations go through this module.
 */

import { supabase } from '@/lib/supabase/client'

export interface Notification {
  id: string
  recipient_id: string
  type: string
  title: string
  message: string
  read: boolean
  metadata?: Record<string, any>
  created_at: string
}

// ============================================
// LIST NOTIFICATIONS
// ============================================
export async function listNotifications(scope: {
  recipientId?: string
  role?: string
  unreadOnly?: boolean
}): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (scope.recipientId) {
    query = query.eq('recipient_id', scope.recipientId)
  }

  if (scope.unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error('[DAL] Error fetching notifications:', error)
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  return data || []
}

// ============================================
// GET UNREAD COUNT
// ============================================
export async function getUnreadCount(recipientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .eq('read', false)

  if (error) {
    console.error('[DAL] Error fetching unread count:', error)
    throw new Error(`Failed to fetch unread count: ${error.message}`)
  }

  return count || 0
}

// ============================================
// MARK AS READ
// ============================================
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('[DAL] Error marking notification as read:', error)
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}

// ============================================
// MARK ALL AS READ
// ============================================
export async function markAllNotificationsAsRead(recipientId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', recipientId)
    .eq('read', false)

  if (error) {
    console.error('[DAL] Error marking all notifications as read:', error)
    throw new Error(`Failed to mark all notifications as read: ${error.message}`)
  }
}

// ============================================
// CREATE NOTIFICATION
// ============================================
export async function createNotification(payload: {
  recipientId: string
  type: string
  title: string
  message: string
  metadata?: Record<string, any>
}): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata || {},
      read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[DAL] Error creating notification:', error)
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  return data
}

// ============================================
// DELETE NOTIFICATION
// ============================================
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('[DAL] Error deleting notification:', error)
    throw new Error(`Failed to delete notification: ${error.message}`)
  }
}

