import {
  createNotification as createNotificationBase,
  getNotifications,
  type NotificationRecord,
  type NotificationRole,
  type NotificationType,
} from '@/lib/notifications'

/**
 * Backwards-compatible helper for creating employee-focused notifications.
 * New callers should import from `@/lib/notifications` directly.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityId?: string | null,
  entityType: string = 'SUBMISSION',
  role: NotificationRole = 'EMPLOYEE'
) {
  return createNotificationBase({
    userId,
    role,
    type,
    title,
    message,
    entityType,
    entityId: entityId ?? undefined,
  })
}

/**
 * Get all notifications for an employee (convenience wrapper).
 */
export async function getEmployeeNotifications(employeeId: string) {
  return getNotifications(employeeId, 'EMPLOYEE')
}

export type { NotificationRecord }

