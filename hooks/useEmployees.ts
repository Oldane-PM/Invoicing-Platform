'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesKeys } from '@/lib/query/keys'
import * as employeesDAL from '@/lib/data/employees'

/**
 * Hook to fetch all employees (admin directory)
 */
export function useEmployees(filters?: employeesDAL.EmployeeFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.list(filters),
    queryFn: () => employeesDAL.listEmployees(filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch employee directory (with extended data)
 */
export function useEmployeeDirectory(filters?: employeesDAL.EmployeeFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.directory(filters),
    queryFn: () => employeesDAL.listEmployees(filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch a single employee
 */
export function useEmployee(employeeId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.detail(employeeId || ''),
    queryFn: () => employeesDAL.getEmployeeById(employeeId!),
    enabled: !!employeeId && (options?.enabled ?? true),
  })
}

/**
 * Hook to fetch current user's employee profile
 */
export function useCurrentEmployee(employeeId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.me(employeeId || ''),
    queryFn: () => employeesDAL.getEmployeeById(employeeId!),
    enabled: !!employeeId && (options?.enabled ?? true),
  })
}

/**
 * Hook to fetch managers list
 */
export function useManagers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.managers(),
    queryFn: () => employeesDAL.listManagers(),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch manager's team
 */
export function useTeam(managerId: string | null, filters?: employeesDAL.EmployeeFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeesKeys.team(managerId || '', filters),
    queryFn: () => employeesDAL.getTeamByManager(managerId!),
    enabled: !!managerId && (options?.enabled ?? true),
  })
}

/**
 * Hook to update an employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: string; payload: Partial<employeesDAL.Employee> }) =>
      employeesDAL.updateEmployee(employeeId, payload),
    onSuccess: (data, variables) => {
      // Invalidate the specific employee
      queryClient.invalidateQueries({ queryKey: employeesKeys.detail(variables.employeeId) })
      queryClient.invalidateQueries({ queryKey: employeesKeys.me(variables.employeeId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: employeesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: employeesKeys.managers() })
    },
  })
}

/**
 * Hook to count employees (for filters preview)
 */
export function useEmployeeCount(
  filters?: Parameters<typeof employeesDAL.countEmployees>[0],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['employees', 'count', filters],
    queryFn: () => employeesDAL.countEmployees(filters),
    enabled: options?.enabled ?? true,
  })
}

