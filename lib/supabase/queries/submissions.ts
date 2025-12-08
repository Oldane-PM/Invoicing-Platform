import { supabase } from '../client'
import type { Submission } from '@/types/domain'

/**
 * Get all submissions for an employee
 */
export async function getEmployeeSubmissions(employeeId: string) {
  if (!employeeId) {
    return []
  }

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('submission_date', { ascending: false })

  if (error) {
    console.error('Error fetching employee submissions:', error)
    // Only throw if it's a real error, not if data is just null/empty
    if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      throw error
    }
    return []
  }

  // Return empty array if no data, otherwise return the data
  return (data || []) as Submission[]
}

/**
 * Get all submissions for a manager, joined with employee data
 * Sorted by submission_date ascending
 */
export async function getManagerSubmissions(managerId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      employee:employees!submissions_employee_id_fkey (
        id,
        name,
        email,
        hourly_rate
      )
    `)
    .eq('manager_id', managerId)
    .order('submission_date', { ascending: true })

  if (error) {
    console.error('Error fetching manager submissions:', error)
    throw error
  }

  return data as (Submission & {
    employee: { id: string; name: string; email: string; hourly_rate: number | null }
  })[]
}

/**
 * Get a single submission by ID
 */
export async function getSubmissionById(submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      employee:employees!submissions_employee_id_fkey (
        id,
        name,
        email
      )
    `)
    .eq('id', submissionId)
    .single()

  if (error) {
    console.error('Error fetching submission:', error)
    throw error
  }

  return data
}

/**
 * Update submission status (approve or reject)
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: 'approved' | 'rejected',
  managerId: string,
  rejectionReason?: string
) {
  const updateData: any = {
    status,
    acted_by_manager_id: managerId,
    acted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (status === 'rejected' && rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }

  const { data, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating submission status:', error)
    throw error
  }

  return data
}

/**
 * Delete a submission (only if status is 'submitted')
 */
export async function deleteSubmission(submissionId: string, employeeId: string) {
  // First verify the submission belongs to the employee and is in 'submitted' status
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('status, employee_id')
    .eq('id', submissionId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  if (submission.employee_id !== employeeId) {
    throw new Error('Unauthorized: Submission does not belong to employee')
  }

  // Allow deletion only for SUBMITTED status (canonical uppercase)
  // Also handle legacy lowercase for backwards compatibility
  const normalizedStatus = submission.status?.toUpperCase()
  if (normalizedStatus !== 'SUBMITTED') {
    throw new Error('Cannot delete submission: Status is not "SUBMITTED"')
  }

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId)

  if (error) {
    console.error('Error deleting submission:', error)
    throw error
  }
}
