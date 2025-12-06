import { getSupabaseAdmin } from '@/lib/supabase/server'

export type NotificationRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'

export type NotificationType =
  | 'HOURS_SUBMITTED'
  | 'HOURS_APPROVED'
  | 'HOURS_REJECTED_MANAGER'
  | 'HOURS_CLARIFICATION_MANAGER'
  | 'HOURS_REJECTED_ADMIN'
  | 'HOURS_CLARIFICATION_ADMIN'
  | 'PAYMENT_PROCESSED'
  // Team / misc events (extended beyond spec for existing flows)
  | 'TEAM_ADDED'
  | 'TEAM_REMOVED'

export interface NotificationRecord {
  id: string
  user_id: string
  role: NotificationRole
  type: NotificationType | string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  metadata: Record<string, any> | null
  created_at: string
}

export interface CreateNotificationInput {
  userId: string
  role: NotificationRole
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}

/**
 * Low-level helper to insert a notification into Supabase.
 * This should be called from server-only contexts (API routes, server actions).
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationRecord | null> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        role: input.role,
        type: input.type,
        title: input.title,
        message: input.message,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    return data as NotificationRecord
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return null
  }
}

export async function getNotifications(
  userId: string,
  role?: NotificationRole,
  limit: number = 50
): Promise<NotificationRecord[]> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  // Deduplicate by id (in case of any database issues)
  const seen = new Set<string>()
  const unique = (data || []).filter((n: NotificationRecord) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })

  return unique as NotificationRecord[]
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking notification as read:', error)
  }
}

export async function markAllNotificationsRead(userId: string, role?: NotificationRole) {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (role) {
    query = query.eq('role', role)
  }

  const { error } = await query

  if (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

/**
 * Derive a navigation target URL for a given notification.
 * This is used by the NotificationDrawer/bell on the client.
 */
export function getNotificationTargetUrl(notification: NotificationRecord): string | null {
  switch (notification.entity_type) {
    case 'SUBMISSION':
      return notification.entity_id ? `/submissions/${notification.entity_id}` : null
    default:
      return null
  }
}


