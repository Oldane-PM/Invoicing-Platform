'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeToRealtimeChanges } from '@/lib/realtime/subscribe'

interface RealtimeProviderProps {
  children: React.ReactNode
  role: 'admin' | 'manager' | 'employee'
  employeeId?: string
  managerId?: string
}

/**
 * RealtimeProvider
 * 
 * Wraps a portal layout and sets up realtime subscriptions.
 * Should be used in admin/manager/employee layout components.
 */
export function RealtimeProvider({
  children,
  role,
  employeeId,
  managerId,
}: RealtimeProviderProps) {
  const queryClient = useQueryClient()
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Only set up subscription if we have the required IDs
    if (role === 'employee' && !employeeId) {
      console.log('[RealtimeProvider] Waiting for employeeId...')
      return
    }
    if (role === 'manager' && !managerId) {
      console.log('[RealtimeProvider] Waiting for managerId...')
      return
    }

    // Clean up previous subscription if any
    if (cleanupRef.current) {
      cleanupRef.current()
    }

    // Set up new subscription
    cleanupRef.current = subscribeToRealtimeChanges(queryClient, {
      role,
      employeeId,
      managerId,
    })

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [queryClient, role, employeeId, managerId])

  return <>{children}</>
}

