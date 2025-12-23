'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  type UserRole,
  normalizeRole,
  canAccessPath,
  getDashboardForRole,
} from '@/lib/auth/role-utils'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
}

export function RouteGuard({ children, requiredRoles }: RouteGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthorization()
  }, [pathname])

  const checkAuthorization = () => {
    // Skip for public routes
    const publicRoutes = ['/sign-in', '/login']
    if (publicRoutes.includes(pathname)) {
      setIsAuthorized(true)
      setIsLoading(false)
      return
    }

    // Get user role from localStorage
    const storedRole = localStorage.getItem('userRole')
    const role = normalizeRole(storedRole)

    // Check if user is logged in
    const employeeId = localStorage.getItem('employeeId')
    if (!employeeId) {
      router.push('/sign-in')
      return
    }

    // Check required roles if specified
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(role)) {
        showUnauthorizedToast()
        router.push(getDashboardForRole(role))
        return
      }
    }

    // Check if user can access this path
    if (!canAccessPath(role, pathname)) {
      showUnauthorizedToast()
      router.push(getDashboardForRole(role))
      return
    }

    setIsAuthorized(true)
    setIsLoading(false)
  }

  const showUnauthorizedToast = () => {
    // Create a simple toast notification
    if (typeof window !== 'undefined') {
      // Use a simple alert or implement toast
      const toastDiv = document.createElement('div')
      toastDiv.className = 'fixed top-4 right-4 z-[100] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg'
      toastDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>You don't have access to that area.</span>
        </div>
      `
      document.body.appendChild(toastDiv)
      
      setTimeout(() => {
        toastDiv.remove()
      }, 4000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

