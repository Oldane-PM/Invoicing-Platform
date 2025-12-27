/**
 * Onboarding Data Access Layer
 * 
 * Handles all employee onboarding operations including:
 * - Personal information submission
 * - Banking details submission
 * - Admin approval workflow
 * - Progress tracking
 */

import { createClientComponentClient } from '@supabase/supabase-js'

// =====================================================
// Types
// =====================================================

export type OnboardingApprovalStatus = 'NOT_SUBMITTED' | 'WAITING' | 'APPROVED' | 'REJECTED'
export type OnboardingStatus = 'INCOMPLETE' | 'COMPLETE'

export interface OnboardingProgress {
  step1_submit_request: boolean
  step2_personal_info: boolean
  step3_banking_info: boolean
  step4_admin_approval: boolean
  step5_contract_complete: boolean
  step6_manager_assigned: boolean
  completed_steps: number
  total_steps: number
}

export interface OnboardingData {
  employeeId: string
  employeeName: string
  employeeEmail: string
  
  // Step tracking timestamps
  personalInfoCompletedAt: string | null
  bankingInfoCompletedAt: string | null
  onboardingSubmittedAt: string | null
  adminApprovedAt: string | null
  contractCompletedAt: string | null
  managerAssignedAt: string | null
  
  // Admin review
  adminApprovalStatus: OnboardingApprovalStatus
  adminRejectionReason: string | null
  adminApprovedBy: string | null
  
  // Manager assignment
  reportingManagerId: string | null
  managerName: string | null
  
  // Overall status
  onboardingStatus: OnboardingStatus
  progress: OnboardingProgress
  
  createdAt: string
  updatedAt: string
}

export interface PersonalInfoPayload {
  name: string
  address: string
  state_parish: string
  country: string
  zip_code: string
  email: string
  phone: string
}

export interface BankingInfoPayload {
  bank_name: string
  bank_address: string
  swift_code: string
  aba_wire_routing: string
  account_type: string
  currency: string
  account_number: string
}

// =====================================================
// Helper Functions
// =====================================================

function computeProgress(employee: any): OnboardingProgress {
  const progress: OnboardingProgress = {
    step1_submit_request: true, // Account exists
    step2_personal_info: !!employee.personal_info_completed_at,
    step3_banking_info: !!employee.banking_info_completed_at && !!employee.onboarding_submitted_at,
    step4_admin_approval: employee.admin_approval_status === 'APPROVED',
    step5_contract_complete: !!employee.contract_completed_at,
    step6_manager_assigned: !!employee.reporting_manager_id && !!employee.manager_assigned_at,
    completed_steps: 0,
    total_steps: 6,
  }
  
  // Count completed steps
  progress.completed_steps = [
    progress.step1_submit_request,
    progress.step2_personal_info,
    progress.step3_banking_info,
    progress.step4_admin_approval,
    progress.step5_contract_complete,
    progress.step6_manager_assigned,
  ].filter(Boolean).length
  
  return progress
}

function transformToOnboardingData(employee: any, manager: any = null): OnboardingData {
  return {
    employeeId: employee.id,
    employeeName: employee.name || '',
    employeeEmail: employee.email || '',
    
    personalInfoCompletedAt: employee.personal_info_completed_at,
    bankingInfoCompletedAt: employee.banking_info_completed_at,
    onboardingSubmittedAt: employee.onboarding_submitted_at,
    adminApprovedAt: employee.admin_approved_at,
    contractCompletedAt: employee.contract_completed_at,
    managerAssignedAt: employee.manager_assigned_at,
    
    adminApprovalStatus: employee.admin_approval_status || 'NOT_SUBMITTED',
    adminRejectionReason: employee.admin_rejection_reason,
    adminApprovedBy: employee.admin_approved_by,
    
    reportingManagerId: employee.reporting_manager_id,
    managerName: manager?.name || null,
    
    onboardingStatus: employee.onboarding_status || 'INCOMPLETE',
    progress: computeProgress(employee),
    
    createdAt: employee.created_at,
    updatedAt: employee.updated_at,
  }
}

// =====================================================
// Employee Operations
// =====================================================

/**
 * Get onboarding status for an employee
 */
export async function getOnboardingStatus(employeeId: string): Promise<OnboardingData | null> {
  const supabase = createClientComponentClient()
  
  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      manager:reporting_manager_id(name)
    `)
    .eq('id', employeeId)
    .single()
  
  if (error || !employee) {
    console.error('Error fetching onboarding status:', error)
    return null
  }
  
  return transformToOnboardingData(employee, employee.manager)
}

/**
 * Save personal information (Step 1)
 */
export async function savePersonalInfo(
  employeeId: string,
  payload: PersonalInfoPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        ...payload,
        personal_info_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error saving personal info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save personal information',
    }
  }
}

/**
 * Save banking information (Step 2)
 */
export async function saveBankingInfo(
  employeeId: string,
  payload: BankingInfoPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        ...payload,
        banking_info_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error saving banking info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save banking information',
    }
  }
}

/**
 * Submit onboarding for admin review (completes Step 3)
 */
export async function submitOnboarding(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    // First, verify both personal and banking info are completed
    const { data: employee } = await supabase
      .from('employees')
      .select('personal_info_completed_at, banking_info_completed_at')
      .eq('id', employeeId)
      .single()
    
    if (!employee?.personal_info_completed_at || !employee?.banking_info_completed_at) {
      return {
        success: false,
        error: 'Please complete both personal and banking information first',
      }
    }
    
    const { error } = await supabase
      .from('employees')
      .update({
        onboarding_submitted_at: new Date().toISOString(),
        admin_approval_status: 'WAITING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error submitting onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit onboarding',
    }
  }
}

/**
 * Resubmit onboarding after rejection
 */
export async function resubmitOnboarding(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        onboarding_submitted_at: new Date().toISOString(),
        admin_approval_status: 'WAITING',
        admin_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
      .eq('admin_approval_status', 'REJECTED')
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error resubmitting onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resubmit onboarding',
    }
  }
}

// =====================================================
// Admin Operations
// =====================================================

/**
 * Get onboarding queue for admin review
 */
export async function getOnboardingQueue(): Promise<OnboardingData[]> {
  const supabase = createClientComponentClient()
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      *,
      manager:reporting_manager_id(name)
    `)
    .eq('role', 'EMPLOYEE')
    .eq('onboarding_status', 'INCOMPLETE')
    .order('onboarding_submitted_at', { ascending: false, nullsFirst: false })
  
  if (error || !employees) {
    console.error('Error fetching onboarding queue:', error)
    return []
  }
  
  return employees.map((emp) => transformToOnboardingData(emp, emp.manager))
}

/**
 * Approve employee onboarding (Step 4)
 */
export async function adminApproveOnboarding(
  employeeId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        admin_approval_status: 'APPROVED',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: adminId,
        admin_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
      .eq('admin_approval_status', 'WAITING')
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error approving onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve onboarding',
    }
  }
}

/**
 * Reject employee onboarding
 */
export async function adminRejectOnboarding(
  employeeId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  if (!reason?.trim()) {
    return {
      success: false,
      error: 'Rejection reason is required',
    }
  }
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        admin_approval_status: 'REJECTED',
        admin_rejection_reason: reason,
        admin_approved_at: null,
        admin_approved_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error rejecting onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject onboarding',
    }
  }
}

/**
 * Mark contract information as complete (Step 5)
 */
export async function adminCompleteContract(
  employeeId: string,
  adminId: string,
  contractData?: {
    hourly_rate?: number
    employment_type?: string
    contract_start_date?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const updateData: any = {
      contract_completed_at: new Date().toISOString(),
      contract_completed_by: adminId,
      updated_at: new Date().toISOString(),
    }
    
    // Include contract data if provided
    if (contractData) {
      Object.assign(updateData, contractData)
    }
    
    const { error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error completing contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete contract',
    }
  }
}

/**
 * Assign manager to employee (Step 6)
 */
export async function adminAssignManager(
  employeeId: string,
  managerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('employees')
      .update({
        reporting_manager_id: managerId,
        manager_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error assigning manager:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign manager',
    }
  }
}

/**
 * Check if employee can submit timesheets (onboarding complete)
 */
export async function canSubmitTimesheets(employeeId: string): Promise<boolean> {
  const supabase = createClientComponentClient()
  
  const { data: employee } = await supabase
    .from('employees')
    .select('onboarding_status')
    .eq('id', employeeId)
    .single()
  
  return employee?.onboarding_status === 'COMPLETE'
}

