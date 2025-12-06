'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import {
  type NotificationRecord,
  type NotificationRole,
  getNotificationTargetUrl,
} from '@/lib/notifications'
import { NotificationDrawer } from './NotificationDrawer'

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return

    const userRole = (localStorage.getItem('userRole') ||
      '') as 'employee' | 'manager' | 'admin' | ''
    const userId = localStorage.getItem('employeeId')

    if (!userId || !userRole) {
      return
    }

    const role: NotificationRole =
      userRole === 'employee'
        ? 'EMPLOYEE'
        : userRole === 'manager'
        ? 'MANAGER'
        : 'ADMIN'

    try {
      setLoading(true)
      const params = new URLSearchParams({ userId, role })
      const res = await fetch(`/api/notifications?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!res.ok) {
        console.error('Failed to load notifications')
        return
      }

      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (typeof window === 'undefined') return

    const userId = localStorage.getItem('employeeId')
    if (!userId) return

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id, userId }),
      })
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }

    setOpen(false)
    await fetchNotifications()

    const targetUrl = getNotificationTargetUrl(notification)
    if (targetUrl) {
      router.push(targetUrl)
    }
  }

  const handleMarkAllRead = async () => {
    if (typeof window === 'undefined') return

    const userRole = (localStorage.getItem('userRole') ||
      '') as 'employee' | 'manager' | 'admin' | ''
    const userId = localStorage.getItem('employeeId')

    if (!userId || !userRole) return

    const role: NotificationRole =
      userRole === 'employee'
        ? 'EMPLOYEE'
        : userRole === 'manager'
        ? 'MANAGER'
        : 'ADMIN'

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      await fetchNotifications()
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
        onClose={() => setOpen(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  )
}


