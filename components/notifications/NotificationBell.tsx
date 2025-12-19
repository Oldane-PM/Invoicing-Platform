'use client'

import { useEffect, useState, useMemo } from 'react'
import { Bell } from 'lucide-react'
import {
  type NotificationRecord,
  type NotificationRole,
} from '@/lib/notifications'
import { NotificationDrawer } from './NotificationDrawer'
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  // State for viewing notification details in drawer
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null)

  // Load user info from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(localStorage.getItem('employeeId'))
      setUserRole(localStorage.getItem('userRole'))
    }
  }, [])

  // Use TanStack Query hook for notifications with auto-refresh
  const { 
    data: notificationsData, 
    isLoading: loading,
    refetch: refetchNotifications
  } = useNotifications(
    { recipientId: userId || undefined, role: userRole || undefined },
    { enabled: !!userId }
  )

  // Mutations
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  // Transform to expected format
  const notifications: NotificationRecord[] = useMemo(() => {
    if (!notificationsData) return []
    return notificationsData.map((n: any) => ({
      id: n.id,
      user_id: n.recipient_id || userId || '',
      role: (userRole?.toUpperCase() || 'EMPLOYEE') as NotificationRole,
      type: n.type,
      title: n.title,
      message: n.message,
      entity_type: n.metadata?.entity_type || null,
      entity_id: n.metadata?.entity_id || null,
      is_read: n.read ?? false,
      metadata: n.metadata || null,
      created_at: n.created_at,
    }))
  }, [notificationsData, userId, userRole])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!userId) return

    // Open notification in detail view (no navigation!)
    setSelectedNotification(notification)

    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await markAsRead.mutateAsync(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read', error)
      }
    }
  }

  const handleBackToList = () => {
    setSelectedNotification(null)
  }

  const handleCloseDrawer = () => {
    setOpen(false)
    setSelectedNotification(null)
  }

  const handleMarkAllRead = async () => {
    if (!userId) return

    try {
      await markAllAsRead.mutateAsync(userId)
    } catch (error) {
      console.error('Failed to mark notifications as read', error)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {loading ? null : unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <NotificationDrawer
        open={open}
        onClose={handleCloseDrawer}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
        selectedNotification={selectedNotification}
        onBackToList={handleBackToList}
      />
    </>
  )
}


