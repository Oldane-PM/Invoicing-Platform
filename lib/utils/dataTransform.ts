/**
 * Utility functions to transform data between database (snake_case) and frontend (camelCase)
 */
import type { Submission } from '@/types/domain'

export interface SubmissionDB {
  id: string
  employee_id: string
  manager_id: string | null
  submission_date: string
  hours_submitted: number
  overtime_hours: number | null
  description: string
  overtime_description: string | null
  status: 'submitted' | 'approved' | 'rejected' | 'payment_done'
  invoice_id: string | null
  rejection_reason: string | null
  acted_by_manager_id: string | null
  acted_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmissionFrontend {
  id: string
  month: string
  date: string
  hoursSubmitted: number
  overtimeHours: number | null
  description: string
  overtimeDescription: string | null
  status: 'submitted' | 'approved' | 'payment done'
  invoiceUrl: string | null
  invoiceId: string | null
}

/**
 * Transform database submission to frontend format
 */
export function transformSubmissionToFrontend(dbSubmission: SubmissionDB): SubmissionFrontend {
  return {
    id: dbSubmission.id,
    month: new Date(dbSubmission.submission_date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    date: dbSubmission.submission_date,
    hoursSubmitted: dbSubmission.hours_submitted,
    overtimeHours: dbSubmission.overtime_hours,
    description: dbSubmission.description,
    overtimeDescription: dbSubmission.overtime_description,
    status:
      dbSubmission.status === 'payment_done'
        ? 'payment done'
        : (dbSubmission.status as 'submitted' | 'approved' | 'payment done'),
    invoiceUrl: dbSubmission.invoice_id ? `/invoices/${dbSubmission.invoice_id}` : null,
    invoiceId: dbSubmission.invoice_id,
  }
}

/**
 * Transform frontend submission to database format
 */
export function transformSubmissionToDB(
  frontendSubmission: Partial<SubmissionFrontend>,
  employeeId: string,
  managerId?: string | null
): Partial<SubmissionDB> {
  return {
    employee_id: employeeId,
    manager_id: managerId || null,
    submission_date: frontendSubmission.date || '',
    hours_submitted: frontendSubmission.hoursSubmitted || 0,
    overtime_hours: frontendSubmission.overtimeHours && frontendSubmission.overtimeHours > 0
      ? frontendSubmission.overtimeHours
      : null,
    description: frontendSubmission.description || '',
    overtime_description:
      frontendSubmission.overtimeHours && frontendSubmission.overtimeHours > 0
        ? frontendSubmission.overtimeDescription || null
        : null,
    status: frontendSubmission.status === 'payment done' ? 'payment_done' : (frontendSubmission.status as any) || 'submitted',
  }
}

