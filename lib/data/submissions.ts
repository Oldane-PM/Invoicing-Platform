/**
 * Data Access Layer: Submissions
 * 
 * All submission-related database operations go through this module.
 * UI components should NEVER call supabase directly.
 */

import { supabase } from '@/lib/supabase/client'

export interface Submission {
  id: string
  employee_id: string
  submission_date: string
  end_date?: string | null
  hours_submitted: number
  overtime_hours: number
  description?: string | null
  overtime_description?: string | null
  status: string
  manager_comment?: string | null
  admin_comment?: string | null
  invoice_id?: string | null
  created_at: string
  updated_at: string
}

export interface SubmissionFilters {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface SubmissionPayload {
  employee_id: string
  submission_date: string
  end_date?: string
  hours_submitted: number
  overtime_hours?: number
  description?: string
  overtime_description?: string
}

// ============================================
// LIST
// ============================================
export async function listSubmissions(
  scope: { employeeId?: string; managerId?: string; role?: string },
  filters?: SubmissionFilters
): Promise<Submission[]> {
  let query = supabase
    .from('submissions')
    .select('*')
    .order('submission_date', { ascending: false })

  // Scope by employee
  if (scope.employeeId) {
    query = query.eq('employee_id', scope.employeeId)
  }

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Apply date range filter
  if (filters?.startDate) {
    query = query.gte('submission_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('submission_date', filters.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[DAL] Error fetching submissions:', error)
    throw new Error(`Failed to fetch submissions: ${error.message}`)
  }

  return data || []
}

// ============================================
// GET BY ID
// ============================================
export async function getSubmissionById(submissionId: string): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[DAL] Error fetching submission:', error)
    throw new Error(`Failed to fetch submission: ${error.message}`)
  }

  return data
}

// ============================================
// CREATE
// ============================================
export async function createSubmission(payload: SubmissionPayload): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      ...payload,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[DAL] Error creating submission:', error)
    throw new Error(`Failed to create submission: ${error.message}`)
  }

  return data
}

// ============================================
// UPDATE
// ============================================
export async function updateSubmission(
  submissionId: string,
  payload: Partial<SubmissionPayload> & { status?: string; manager_comment?: string; admin_comment?: string }
): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select()
    .single()

  if (error) {
    console.error('[DAL] Error updating submission:', error)
    throw new Error(`Failed to update submission: ${error.message}`)
  }

  return data
}

// ============================================
// DELETE
// ============================================
export async function deleteSubmission(submissionId: string): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId)

  if (error) {
    console.error('[DAL] Error deleting submission:', error)
    throw new Error(`Failed to delete submission: ${error.message}`)
  }
}

// ============================================
// DASHBOARD AGGREGATES
// ============================================
export interface SubmissionDashboardStats {
  totalSubmissions: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalHours: number
  totalOvertimeHours: number
}

export async function getSubmissionDashboardStats(
  scope: { employeeId?: string; managerId?: string; role?: string },
  filters?: SubmissionFilters
): Promise<SubmissionDashboardStats> {
  let query = supabase
    .from('submissions')
    .select('status, hours_submitted, overtime_hours')

  if (scope.employeeId) {
    query = query.eq('employee_id', scope.employeeId)
  }

  if (filters?.startDate) {
    query = query.gte('submission_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('submission_date', filters.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[DAL] Error fetching dashboard stats:', error)
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`)
  }

  const submissions = data || []

  return {
    totalSubmissions: submissions.length,
    pendingCount: submissions.filter(s => s.status === 'SUBMITTED').length,
    approvedCount: submissions.filter(s => 
      s.status === 'MANAGER_APPROVED' || s.status === 'ADMIN_APPROVED' || s.status === 'PROCESSED'
    ).length,
    rejectedCount: submissions.filter(s => 
      s.status === 'MANAGER_REJECTED' || s.status === 'ADMIN_REJECTED'
    ).length,
    totalHours: submissions.reduce((sum, s) => sum + (s.hours_submitted || 0), 0),
    totalOvertimeHours: submissions.reduce((sum, s) => sum + (s.overtime_hours || 0), 0),
  }
}

