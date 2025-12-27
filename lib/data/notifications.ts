/**
 * Data Access Layer: Notifications
 * 
 * All notification-related database operations go through this module.
 */

import { supabase } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  role: string
  type: string
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  is_read: boolean
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
    query = query.eq('user_id', scope.recipientId)
  }

  if (scope.unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error('[DAL] Error fetching notifications:', error)
    // Return empty array on schema errors to prevent console spam
    if (error.code === '42703') {
      console.warn('[DAL] Schema mismatch - returning empty notifications')
      return []
    }
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
    .eq('user_id', recipientId)
    .eq('is_read', false)

  if (error) {
    console.error('[DAL] Error fetching unread count:', error)
    if (error.code === '42703') {
      console.warn('[DAL] Schema mismatch - returning 0 count')
      return 0
    }
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
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('[DAL] Error marking notification as read:', error)
    if (error.code === '42703') {
      console.warn('[DAL] Schema mismatch - skipping mark as read')
      return
    }
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}

// ============================================
// MARK ALL AS READ
// ============================================
export async function markAllNotificationsAsRead(recipientId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', recipientId)
    .eq('is_read', false)

  if (error) {
    console.error('[DAL] Error marking all notifications as read:', error)
    if (error.code === '42703') {
      console.warn('[DAL] Schema mismatch - skipping mark all as read')
      return
    }
    throw new Error(`Failed to mark all notifications as read: ${error.message}`)
  }
}

// ============================================
// CREATE NOTIFICATION
// ============================================
export async function createNotification(payload: {
  recipientId: string
  role: string
  type: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.recipientId,
      role: payload.role,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      metadata: payload.metadata || {},
      is_read: false,
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

