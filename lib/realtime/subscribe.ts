'use client'

import { supabase } from '@/lib/supabase/client'
import { QueryClient } from '@tanstack/react-query'
import { 
  submissionsKeys, 
  employeesKeys, 
  holidaysKeys, 
  notificationsKeys 
} from '@/lib/query/keys'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Track active subscriptions to prevent duplicates
const activeChannels = new Map<string, RealtimeChannel>()

interface SubscriptionScope {
  role: 'admin' | 'manager' | 'employee'
  employeeId?: string
  managerId?: string
}

/**
 * Create a unique channel ID for a portal
 */
function getChannelId(scope: SubscriptionScope): string {
  if (scope.role === 'admin') {
    return `rt-admin`
  }
  if (scope.role === 'manager' && scope.managerId) {
    return `rt-manager-${scope.managerId}`
  }
  if (scope.employeeId) {
    return `rt-employee-${scope.employeeId}`
  }
  return `rt-unknown`
}

/**
 * Subscribe to realtime changes for a portal
 * Returns a cleanup function
 */
export function subscribeToRealtimeChanges(
  queryClient: QueryClient,
  scope: SubscriptionScope
): () => void {
  const channelId = getChannelId(scope)
  
  // Check for existing subscription
  if (activeChannels.has(channelId)) {
    console.log(`[Realtime] Channel ${channelId} already exists, skipping...`)
    return () => {}
  }

  console.log(`[Realtime] Creating subscription for ${channelId}`)

  const channel = supabase
    .channel(channelId)
    // ========================================
    // SUBMISSIONS TABLE
    // ========================================
    .on<any>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      (payload) => {
        console.log(`[Realtime] Submissions change:`, payload.eventType)
        handleSubmissionsChange(queryClient, scope, payload)
      }
    )
    // ========================================
    // EMPLOYEES TABLE
    // ========================================
    .on<any>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'employees' },
      (payload) => {
        console.log(`[Realtime] Employees change:`, payload.eventType)
        handleEmployeesChange(queryClient, scope, payload)
      }
    )
    // ========================================
    // HOLIDAYS TABLE
    // ========================================
    .on<any>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'holidays' },
      (payload) => {
        console.log(`[Realtime] Holidays change:`, payload.eventType)
        handleHolidaysChange(queryClient, scope, payload)
      }
    )
    // ========================================
    // NOTIFICATIONS TABLE
    // ========================================
    .on<any>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        console.log(`[Realtime] Notifications change:`, payload.eventType)
        handleNotificationsChange(queryClient, scope, payload)
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Channel ${channelId} status:`, status)
    })

  activeChannels.set(channelId, channel)

  // Return cleanup function
  return () => {
    console.log(`[Realtime] Unsubscribing from ${channelId}`)
    channel.unsubscribe()
    activeChannels.delete(channelId)
  }
}

// ============================================
// HANDLERS
// ============================================

function handleSubmissionsChange(
  queryClient: QueryClient,
  scope: SubscriptionScope,
  payload: RealtimePostgresChangesPayload<any>
) {
  const { eventType, new: newRecord, old: oldRecord } = payload
  const record = newRecord || oldRecord

  // Always invalidate lists and dashboards for the user's scope
  if (scope.role === 'employee' && scope.employeeId) {
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.list({ employeeId: scope.employeeId }) 
    })
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.dashboard({ employeeId: scope.employeeId }) 
    })
  }

  if (scope.role === 'manager' && scope.managerId) {
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.list({ managerId: scope.managerId }) 
    })
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.dashboard({ managerId: scope.managerId }) 
    })
  }

  if (scope.role === 'admin') {
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.list({ role: 'ADMIN' }) 
    })
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.dashboard({ role: 'ADMIN' }) 
    })
  }

  // Invalidate specific submission detail if we have the ID
  if (record?.id) {
    queryClient.invalidateQueries({ 
      queryKey: submissionsKeys.detail(record.id) 
    })
  }

  // Invalidate notification queries (status changes often generate notifications)
  if (scope.employeeId) {
    queryClient.invalidateQueries({
      queryKey: notificationsKeys.list({ employeeId: scope.employeeId })
    })
    queryClient.invalidateQueries({
      queryKey: notificationsKeys.unreadCount({ employeeId: scope.employeeId })
    })
  }
}

function handleEmployeesChange(
  queryClient: QueryClient,
  scope: SubscriptionScope,
  payload: RealtimePostgresChangesPayload<any>
) {
  const { new: newRecord, old: oldRecord } = payload
  const record = newRecord || oldRecord

  // Admin sees all employees
  if (scope.role === 'admin') {
    queryClient.invalidateQueries({ queryKey: employeesKeys.lists() })
    queryClient.invalidateQueries({ queryKey: employeesKeys.managers() })
    if (record?.id) {
      queryClient.invalidateQueries({ queryKey: employeesKeys.detail(record.id) })
    }
  }

  // Manager sees their team
  if (scope.role === 'manager' && scope.managerId) {
    queryClient.invalidateQueries({ 
      queryKey: employeesKeys.team(scope.managerId) 
    })
  }

  // Employee sees their own profile
  if (scope.role === 'employee' && scope.employeeId && record?.id === scope.employeeId) {
    queryClient.invalidateQueries({ 
      queryKey: employeesKeys.me(scope.employeeId) 
    })
    queryClient.invalidateQueries({ 
      queryKey: employeesKeys.detail(scope.employeeId) 
    })
  }
}

function handleHolidaysChange(
  queryClient: QueryClient,
  scope: SubscriptionScope,
  payload: RealtimePostgresChangesPayload<any>
) {
  // Holidays affect all portals - invalidate all holiday queries
  queryClient.invalidateQueries({ queryKey: holidaysKeys.all })
  
  // This will refresh:
  // - Admin holiday list
  // - Employee calendar blocked days
  // - Manager calendar (if applicable)
}

function handleNotificationsChange(
  queryClient: QueryClient,
  scope: SubscriptionScope,
  payload: RealtimePostgresChangesPayload<any>
) {
  const { new: newRecord, old: oldRecord } = payload
  const record = newRecord || oldRecord

  // Only invalidate notifications for the current user
  const recipientId = record?.recipient_id

  if (scope.employeeId) {
    // Check if this notification is for the current user
    if (!recipientId || recipientId === scope.employeeId) {
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.list({ employeeId: scope.employeeId })
      })
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.unreadCount({ employeeId: scope.employeeId })
      })
    }
  }

  // Admin role-based notifications
  if (scope.role === 'admin') {
    queryClient.invalidateQueries({
      queryKey: notificationsKeys.list({ role: 'ADMIN' })
    })
    queryClient.invalidateQueries({
      queryKey: notificationsKeys.unreadCount({ role: 'ADMIN' })
    })
  }
}

/**
 * Hook-friendly version for use in components
 */
export function useRealtimeSubscription(
  queryClient: QueryClient,
  scope: SubscriptionScope | null
) {
  // This will be called from useEffect in layout components
  if (!scope) return () => {}
  return subscribeToRealtimeChanges(queryClient, scope)
}

