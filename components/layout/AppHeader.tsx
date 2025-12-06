'use client'

import { LogOut, Settings, FileText, Clock, User as UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

type Portal = 'admin' | 'manager' | 'employee'

interface AppHeaderProps {
  portal: Portal
  title: string
  subtitle?: string
  leftExtra?: ReactNode
  /** Optional explicit logout handler. If omitted, falls back to role-based localStorage clearing. */
  onLogout?: () => void
  /** Optional primary action in the header (varies by portal) */
  primaryActionLabel?: string
  primaryActionIcon?: ReactNode
  onPrimaryAction?: () => void
  /** Employee portal only: open the Profile page */
  onProfileClick?: () => void
}

const portalAccentClass: Record<Portal, string> = {
  admin: 'from-blue-500 to-blue-600',
  manager: 'from-indigo-500 to-indigo-600',
  employee: 'from-teal-600 to-teal-700',
}

export function AppHeader({
  portal,
  title,
  subtitle,
  leftExtra,
  onLogout,
  primaryActionLabel,
  primaryActionIcon,
  onPrimaryAction,
  onProfileClick,
}: AppHeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }

    // Default behavior – clear role-specific storage and route to login
    const userRole = localStorage.getItem('userRole')
    if (userRole === 'manager') {
      localStorage.removeItem('managerId')
    }
    if (userRole === 'employee' || userRole === 'manager' || userRole === 'admin') {
      localStorage.removeItem('employeeId')
    }
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  const isEmployee = portal === 'employee'
  const hasPrimary = !!primaryActionLabel && !!onPrimaryAction

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${portalAccentClass[portal]} rounded-xl flex items-center justify-center shadow-md shadow-slate-200`}
            >
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-900 leading-tight">{title}</span>
              {subtitle && (
                <span className="text-xs text-slate-500 leading-tight">{subtitle}</span>
              )}
            </div>
            {leftExtra && <div className="ml-4">{leftExtra}</div>}
          </div>

          {/* Right: Role-based actions + Notification, Settings, Logout */}
          <div className="flex items-center space-x-3">
            {hasPrimary && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium text-white transition-colors bg-primary-500 hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
              >
                {primaryActionIcon ?? (portal === 'employee' ? <Clock className="w-4 h-4" /> : null)}
                <span>{primaryActionLabel}</span>
              </button>
            )}

            {isEmployee && onProfileClick && (
              <button
                type="button"
                onClick={onProfileClick}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                aria-label="Open profile"
              >
                <UserIcon className="w-5 h-5" />
              </button>
            )}

            <NotificationBell />
            <button
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

