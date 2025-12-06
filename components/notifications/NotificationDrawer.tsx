'use client'

import { X, ChevronRight, Bell, CheckCircle2, XCircle, AlertCircle, DollarSign, Clock, Users, UserMinus } from 'lucide-react'
import type { NotificationRecord } from '@/lib/notifications'

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
  notifications: NotificationRecord[]
  onNotificationClick: (notification: NotificationRecord) => void
  onMarkAllRead: () => void
}

// Get notification styling based on type
function getNotificationStyle(type: string) {
  switch (type) {
    case 'HOURS_APPROVED':
      return {
        borderColor: 'border-emerald-500',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-50',
      }
    case 'HOURS_REJECTED_MANAGER':
    case 'HOURS_REJECTED_ADMIN':
      return {
        borderColor: 'border-red-500',
        icon: XCircle,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-50',
      }
    case 'HOURS_CLARIFICATION_MANAGER':
    case 'HOURS_CLARIFICATION_ADMIN':
      return {
        borderColor: 'border-amber-500',
        icon: AlertCircle,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50',
      }
    case 'PAYMENT_PROCESSED':
      return {
        borderColor: 'border-blue-500',
        icon: DollarSign,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-50',
      }
    case 'HOURS_SUBMITTED':
      return {
        borderColor: 'border-indigo-500',
        icon: Clock,
        iconColor: 'text-indigo-500',
        iconBg: 'bg-indigo-50',
      }
    case 'TEAM_ADDED':
      return {
        borderColor: 'border-teal-500',
        icon: Users,
        iconColor: 'text-teal-500',
        iconBg: 'bg-teal-50',
      }
    case 'TEAM_REMOVED':
      return {
        borderColor: 'border-slate-500',
        icon: UserMinus,
        iconColor: 'text-slate-500',
        iconBg: 'bg-slate-100',
      }
    default:
      return {
        borderColor: 'border-slate-400',
        icon: Bell,
        iconColor: 'text-slate-500',
        iconBg: 'bg-slate-50',
      }
  }
}

// Format timestamp to relative format
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  if (notifDate.getTime() === today.getTime()) {
    return `Today, ${timeStr}`
  } else if (notifDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeStr}`
  } else {
    // Show day of week for last 7 days
    const daysAgo = Math.floor((today.getTime() - notifDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      return `${dayName} ${timeStr}`
    }
    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + `, ${timeStr}`
  }
}

// Get entity reference label
function getEntityLabel(notification: NotificationRecord): string | null {
  if (notification.entity_type === 'SUBMISSION' && notification.entity_id) {
    // Extract a short reference from metadata or create one
    const metadata = notification.metadata as any
    if (metadata?.invoiceNumber) {
      return `Submission #${metadata.invoiceNumber}`
    }
    // Create a short ID reference
    return `Submission #INV-${notification.entity_id.slice(0, 4).toUpperCase()}`
  }
  return null
}

export function NotificationDrawer({
  open,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mark all read button */}
          {unreadCount > 0 && (
            <div className="px-5 py-2 border-b border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">You're all caught up</p>
                <p className="mt-1 text-xs text-slate-500">
                  New notifications will appear here when there are updates.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const isUnread = !notification.is_read
                  const style = getNotificationStyle(notification.type)
                  const IconComponent = style.icon
                  const timestamp = formatRelativeTime(notification.created_at)
                  const entityLabel = getEntityLabel(notification)

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => onNotificationClick(notification)}
                        className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors border-l-4 ${
                          isUnread
                            ? `bg-slate-50 ${style.borderColor} hover:bg-slate-100`
                            : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`shrink-0 w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center mt-0.5`}>
                          <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-slate-900`}>
                              {notification.title}
                            </p>
                            {isUnread && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <span>{timestamp}</span>
                            {entityLabel && (
                              <>
                                <span>•</span>
                                <span className="text-primary-500">{entityLabel}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="shrink-0 w-5 h-5 text-slate-300 mt-0.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
