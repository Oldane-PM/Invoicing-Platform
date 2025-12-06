export interface InvoiceItem {
  description: string
  hours: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  from: {
    name: string
    address: string
    state: string
    country: string
    email: string
  }
  billTo: {
    company: string
    address: string
  }
  items: InvoiceItem[]
  total: number
  banking: {
    bankName: string
    bankAddress: string
    swiftCode: string
    abaWireRouting: string
    accountType: string
    currency: string
    accountNumber: string
  }
  submissionId?: string
}

// Database types
export interface Employee {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  // Profile fields (optional, added via migration)
  onboarding_status?: 'not_started' | 'in_progress' | 'completed' | null
  address?: string | null
  state_parish?: string | null
  country?: string | null
  zip_postal_code?: string | null
  phone?: string | null
  bank_name?: string | null
  bank_address?: string | null
  swift_code?: string | null
  aba_wire_routing?: string | null
  account_type?: string | null
  currency?: string | null
  account_number?: string | null
  active_project?: string | null
  hourly_rate?: number | null
  project_types?: string[] | null
  created_at: string
  updated_at: string
}

// Canonical submission status enum - single source of truth across all portals
export type SubmissionStatus =
  | 'SUBMITTED'           // Employee submitted, pending Manager
  | 'MANAGER_REJECTED'    // Manager rejected
  | 'MANAGER_APPROVED'    // Manager approved, pending Admin
  | 'ADMIN_PAID'          // Admin processed payment (final)
  | 'ADMIN_REJECTED'      // Admin rejected after Manager approval
  | 'NEEDS_CLARIFICATION' // Admin needs clarification from Manager

export interface Submission {
  id: string
  employee_id: string
  manager_id: string | null
  submission_date: string
  hours_submitted: number
  overtime_hours: number | null
  description: string
  overtime_description: string | null
  status: SubmissionStatus
  invoice_id: string | null
  manager_comment: string | null
  admin_comment: string | null
  acted_by_manager_id: string | null
  acted_at: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  manager_id: string
  employee_id: string
  project_id: string | null
  project_name: string | null
  contract_start: string
  contract_end: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  employee_id: string
  type: 'submission_approved' | 'submission_rejected' | 'team_removed' | 'team_added'
  title: string
  message: string
  submission_id: string | null
  is_read: boolean
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

