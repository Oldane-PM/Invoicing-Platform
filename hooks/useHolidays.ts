'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holidaysKeys } from '@/lib/query/keys'
import * as holidaysDAL from '@/lib/data/holidays'

/**
 * Hook to fetch all holidays (admin view)
 */
export function useHolidays(filters?: { isActive?: boolean }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: holidaysKeys.list(filters),
    queryFn: () => holidaysDAL.listHolidays(filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch blocked days for employee calendar
 */
export function useBlockedDays(
  scope: {
    employeeId: string
    startDate: string
    endDate: string
    employeeType?: string
    projectId?: string
    country?: string
    region?: string
  } | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: scope ? holidaysKeys.blockedDays(scope) : ['holidays', 'blockedDays', 'none'],
    queryFn: () => holidaysDAL.getBlockedDaysForEmployee(scope!),
    enabled: !!scope && (options?.enabled ?? true),
    // Always fetch fresh data for blocked days
    staleTime: 0,
  })
}

/**
 * Hook to create a holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: holidaysDAL.HolidayPayload) => holidaysDAL.createHoliday(payload),
    onSuccess: () => {
      // Invalidate all holiday queries
      queryClient.invalidateQueries({ queryKey: holidaysKeys.all })
    },
  })
}

/**
 * Hook to delete a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (holidayId: string) => holidaysDAL.deleteHoliday(holidayId),
    onSuccess: () => {
      // Invalidate all holiday queries
      queryClient.invalidateQueries({ queryKey: holidaysKeys.all })
    },
  })
}

