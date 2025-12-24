/**
 * Centralized Submission Status Service
 * Single source of truth for status transitions across all portals
 */

import type { SubmissionStatus } from '@/types/domain'

// ============================================================================
// Status Normalization (handles both legacy lowercase and new uppercase)
// ============================================================================

/**
 * Normalize status to uppercase canonical format
 * Handles legacy lowercase values from database
 */
export function normalizeStatus(status: string | SubmissionStatus): SubmissionStatus {
  const upper = String(status).toUpperCase()
  
  // Map old status values to new canonical values
  const statusMap: Record<string, SubmissionStatus> = {
    'SUBMITTED': 'SUBMITTED',
    'MANAGER_REJECTED': 'MANAGER_REJECTED',
    'MANAGER_APPROVED': 'MANAGER_APPROVED',
    'ADMIN_PAID': 'ADMIN_PAID',
    'ADMIN_REJECTED': 'ADMIN_REJECTED',
    'NEEDS_CLARIFICATION': 'NEEDS_CLARIFICATION',
    // Legacy mappings
    'APPROVED': 'MANAGER_APPROVED',
    'REJECTED': 'MANAGER_REJECTED',
    'PAYMENT_DONE': 'ADMIN_PAID',
  }
  
  return statusMap[upper] || 'SUBMITTED'
}

// ============================================================================
// Status Transition Logic
// ============================================================================

/**
 * Check if employee can edit/delete submission
 */
export function employeeCanEdit(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return ['SUBMITTED', 'MANAGER_REJECTED', 'ADMIN_REJECTED'].includes(normalized)
}

/**
 * Check if employee can delete submission
 */
export function employeeCanDelete(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'SUBMITTED'
}

/**
 * Check if manager can approve submission
 */
export function managerCanApprove(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return ['SUBMITTED', 'NEEDS_CLARIFICATION'].includes(normalized)
}

/**
 * Check if manager can reject submission
 */
export function managerCanReject(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return ['SUBMITTED', 'NEEDS_CLARIFICATION'].includes(normalized)
}

/**
 * Check if admin can process payment
 */
export function adminCanProcessPayment(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'MANAGER_APPROVED'
}

/**
 * Check if admin can reject submission
 */
export function adminCanReject(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'MANAGER_APPROVED'
}

/**
 * Check if admin can request clarification
 */
export function adminCanRequestClarification(status: SubmissionStatus | string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'MANAGER_APPROVED'
}

// ============================================================================
// Status Display Helpers
// ============================================================================

import { 
  Clock, 
  XCircle, 
  CheckCircle, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  type LucideIcon 
} from 'lucide-react'

export interface StatusDisplay {
  label: string
  color: 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'amber'
  bgClass: string
  textClass: string
  textColor: string
  iconBg: string
  iconColor: string
  Icon: LucideIcon
}

export function getStatusDisplay(status: SubmissionStatus | string): StatusDisplay {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case 'SUBMITTED':
      return {
        label: 'Pending Review',
        color: 'yellow',
        bgClass: 'bg-yellow-50',
        textClass: 'text-yellow-800',
        textColor: 'text-yellow-700',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        Icon: Clock,
      }
    case 'MANAGER_REJECTED':
      return {
        label: 'Rejected by Manager',
        color: 'red',
        bgClass: 'bg-red-50',
        textClass: 'text-red-800',
        textColor: 'text-red-700',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        Icon: XCircle,
      }
    case 'MANAGER_APPROVED':
      return {
        label: 'Approved (Pending Payment)',
        color: 'blue',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-800',
        textColor: 'text-blue-700',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        Icon: CheckCircle,
      }
    case 'ADMIN_PAID':
      return {
        label: 'Paid',
        color: 'green',
        bgClass: 'bg-green-50',
        textClass: 'text-green-800',
        textColor: 'text-green-700',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        Icon: DollarSign,
      }
    case 'ADMIN_REJECTED':
      return {
        label: 'Rejected by Admin',
        color: 'red',
        bgClass: 'bg-red-50',
        textClass: 'text-red-800',
        textColor: 'text-red-700',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        Icon: XCircle,
      }
    case 'NEEDS_CLARIFICATION':
      return {
        label: 'Clarification Required',
        color: 'amber',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        textColor: 'text-amber-700',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        Icon: AlertCircle,
      }
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-800',
        textColor: 'text-gray-700',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        Icon: HelpCircle,
      }
  }
}

/**
 * Get employee-facing status label (may differ from internal status)
 */
export function getEmployeeStatusLabel(status: SubmissionStatus | string): string {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case 'SUBMITTED':
      return 'Submitted'
    case 'MANAGER_REJECTED':
      return 'Rejected - Please Revise'
    case 'MANAGER_APPROVED':
      return 'Approved (Pending Payment)'
    case 'ADMIN_PAID':
      return 'Paid'
    case 'ADMIN_REJECTED':
      return 'Rejected - Please Revise'
    case 'NEEDS_CLARIFICATION':
      return 'Under Review'
    default:
      return 'Unknown'
  }
}

/**
 * Get manager-facing status label
 */
export function getManagerStatusLabel(status: SubmissionStatus | string): string {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case 'SUBMITTED':
      return 'Pending Your Review'
    case 'MANAGER_REJECTED':
      return 'Rejected – Awaiting Employee Update'
    case 'MANAGER_APPROVED':
      return 'Approved – Awaiting Admin'
    case 'ADMIN_PAID':
      return 'Paid'
    case 'ADMIN_REJECTED':
      return 'Admin Rejected – Awaiting Employee Update'
    case 'NEEDS_CLARIFICATION':
      return 'Clarification Requested'
    default:
      return 'Unknown'
  }
}

/**
 * Get admin-facing status label
 */
export function getAdminStatusLabel(status: SubmissionStatus | string): string {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case 'SUBMITTED':
      return 'Pending Manager Review'
    case 'MANAGER_REJECTED':
      return 'Manager Rejected'
    case 'MANAGER_APPROVED':
      return 'Ready for Payment'
    case 'ADMIN_PAID':
      return 'Paid'
    case 'ADMIN_REJECTED':
      return 'Rejected'
    case 'NEEDS_CLARIFICATION':
      return 'Awaiting Clarification'
    default:
      return 'Unknown'
  }
}

// ============================================================================
// Status Transition Validation (for API routes)
// ============================================================================

export interface TransitionResult {
  valid: boolean
  newStatus?: SubmissionStatus
  error?: string
}

export function validateManagerApprove(currentStatus: SubmissionStatus): TransitionResult {
  if (!managerCanApprove(currentStatus)) {
    return {
      valid: false,
      error: `Cannot approve submission with status "${currentStatus}". Must be SUBMITTED or NEEDS_CLARIFICATION.`,
    }
  }
  return { valid: true, newStatus: 'MANAGER_APPROVED' }
}

export function validateManagerReject(currentStatus: SubmissionStatus): TransitionResult {
  if (!managerCanReject(currentStatus)) {
    return {
      valid: false,
      error: `Cannot reject submission with status "${currentStatus}". Must be SUBMITTED or NEEDS_CLARIFICATION.`,
    }
  }
  return { valid: true, newStatus: 'MANAGER_REJECTED' }
}

export function validateAdminProcessPayment(currentStatus: SubmissionStatus): TransitionResult {
  if (!adminCanProcessPayment(currentStatus)) {
    return {
      valid: false,
      error: `Cannot process payment for submission with status "${currentStatus}". Must be MANAGER_APPROVED.`,
    }
  }
  return { valid: true, newStatus: 'ADMIN_PAID' }
}

export function validateAdminReject(currentStatus: SubmissionStatus): TransitionResult {
  if (!adminCanReject(currentStatus)) {
    return {
      valid: false,
      error: `Cannot reject submission with status "${currentStatus}". Must be MANAGER_APPROVED.`,
    }
  }
  return { valid: true, newStatus: 'ADMIN_REJECTED' }
}

export function validateAdminRequestClarification(currentStatus: SubmissionStatus): TransitionResult {
  if (!adminCanRequestClarification(currentStatus)) {
    return {
      valid: false,
      error: `Cannot request clarification for submission with status "${currentStatus}". Must be MANAGER_APPROVED.`,
    }
  }
  return { valid: true, newStatus: 'NEEDS_CLARIFICATION' }
}

export function validateEmployeeResubmit(currentStatus: SubmissionStatus): TransitionResult {
  if (!employeeCanEdit(currentStatus)) {
    return {
      valid: false,
      error: `Cannot edit submission with status "${currentStatus}".`,
    }
  }
  return { valid: true, newStatus: 'SUBMITTED' }
}

