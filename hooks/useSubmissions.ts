'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionsKeys } from '@/lib/query/keys'
import * as submissionsDAL from '@/lib/data/submissions'

interface SubmissionScope {
  employeeId?: string
  managerId?: string
  role?: string
}

/**
 * Hook to fetch submissions list
 */
export function useSubmissions(
  scope: SubmissionScope,
  filters?: submissionsDAL.SubmissionFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: submissionsKeys.list(scope, filters),
    queryFn: () => submissionsDAL.listSubmissions(scope, filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch a single submission
 */
export function useSubmission(submissionId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: submissionsKeys.detail(submissionId || ''),
    queryFn: () => submissionsDAL.getSubmissionById(submissionId!),
    enabled: !!submissionId && (options?.enabled ?? true),
  })
}

/**
 * Hook to fetch dashboard stats
 */
export function useSubmissionDashboard(
  scope: SubmissionScope,
  filters?: submissionsDAL.SubmissionFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: submissionsKeys.dashboard(scope, filters),
    queryFn: () => submissionsDAL.getSubmissionDashboardStats(scope, filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to create a submission
 */
export function useCreateSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: submissionsDAL.SubmissionPayload) =>
      submissionsDAL.createSubmission(payload),
    onSuccess: (data) => {
      // Invalidate all submission lists and dashboards
      queryClient.invalidateQueries({ queryKey: submissionsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: submissionsKeys.dashboards() })
    },
  })
}

/**
 * Hook to update a submission
 */
export function useUpdateSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ submissionId, payload }: { submissionId: string; payload: Parameters<typeof submissionsDAL.updateSubmission>[1] }) =>
      submissionsDAL.updateSubmission(submissionId, payload),
    onSuccess: (data, variables) => {
      // Invalidate the specific submission detail
      queryClient.invalidateQueries({ queryKey: submissionsKeys.detail(variables.submissionId) })
      // Invalidate lists and dashboards
      queryClient.invalidateQueries({ queryKey: submissionsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: submissionsKeys.dashboards() })
    },
  })
}

/**
 * Hook to delete a submission
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (submissionId: string) => submissionsDAL.deleteSubmission(submissionId),
    onSuccess: (_, submissionId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: submissionsKeys.detail(submissionId) })
      // Invalidate lists and dashboards
      queryClient.invalidateQueries({ queryKey: submissionsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: submissionsKeys.dashboards() })
    },
  })
}

