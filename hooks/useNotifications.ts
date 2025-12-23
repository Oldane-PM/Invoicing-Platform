'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsKeys } from '@/lib/query/keys'
import * as notificationsDAL from '@/lib/data/notifications'

interface NotificationScope {
  employeeId?: string
  managerId?: string
  role?: string
}

/**
 * Hook to fetch notifications
 */
export function useNotifications(
  scope: { recipientId?: string; role?: string; unreadOnly?: boolean },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: notificationsKeys.list({ 
      employeeId: scope.recipientId, 
      role: scope.role 
    }),
    queryFn: () => notificationsDAL.listNotifications({
      recipientId: scope.recipientId,
      role: scope.role,
      unreadOnly: scope.unreadOnly,
    }),
    enabled: options?.enabled ?? true,
    // Refetch notifications frequently
    refetchInterval: 30000, // Every 30 seconds
  })
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotificationCount(
  recipientId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: notificationsKeys.unreadCount({ employeeId: recipientId || '' }),
    queryFn: () => notificationsDAL.getUnreadCount(recipientId!),
    enabled: !!recipientId && (options?.enabled ?? true),
    refetchInterval: 30000,
  })
}

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => notificationsDAL.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notification queries
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
    },
  })
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipientId: string) => notificationsDAL.markAllNotificationsAsRead(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
    },
  })
}

/**
 * Hook to create a notification
 */
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Parameters<typeof notificationsDAL.createNotification>[0]) =>
      notificationsDAL.createNotification(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all })
    },
  })
}

