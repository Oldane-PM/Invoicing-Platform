// Types for the Employee Detail Drawer

// User role types
export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export interface EmployeeDetail {
  id: string
  name: string
  email: string
  initials: string
  contractorType: 'Full-time' | 'Part-time' | 'Contractor' | 'Freelancer'
  status: 'Active' | 'Inactive'
  hourlyRate: number
  overtimeRate?: number
  // Access control fields
  role: UserRole
  reportingManagerId?: string | null
  reportingManagerName?: string | null
}

export interface Submission {
  id: string
  date: string
  projectName: string
  status: 'Submitted' | 'Approved' | 'Rejected' | 'Paid'
  regularHours: number
  overtimeHours: number
  totalAmount: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  amount: number
  status: 'Paid' | 'Pending' | 'Overdue'
}

export interface ContractInfo {
  startDate: string
  endDate?: string
  rateType: 'hourly' | 'fixed'
  hourlyRate: number
  overtimeRate?: number
  fixedIncome?: number
  positionTitle: string
  department: string
  reportingManager: string
  reportingManagerId?: string // Manager ID for database sync
}

export interface StatusLogEntry {
  id: string
  actionTitle: string
  timestamp: string
  description: string
  performedBy: string
}

