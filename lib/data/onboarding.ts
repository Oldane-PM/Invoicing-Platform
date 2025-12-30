/**
 * Onboarding Data Access Layer (Refactored)
 * 
 * Uses dedicated onboarding tables (onboarding_cases, onboarding_personal,
 * onboarding_banking, onboarding_contract, onboarding_events) instead of
 * embedding everything in the employees table.
 * 
 * Key changes:
 * - Employees table is now "system of record" for active staff only
 * - Onboarding workflow lives in separate tables
 * - Full audit trail via onboarding_events
 * - Improved security via RLS and table separation
 */

import { supabase } from '@/lib/supabase/client'

// =====================================================
// Types
// =====================================================

export type OnboardingState = 
  | 'draft'
  | 'submitted'
  | 'personal_pending'
  | 'banking_pending'
  | 'admin_review'
  | 'contract_pending'
  | 'manager_pending'
  | 'approved'
  | 'rejected'
  | 'closed'

export type OnboardingEventType =
  | 'case_created'
  | 'submitted'
  | 'personal_updated'
  | 'banking_updated'
  | 'contract_updated'
  | 'manager_assigned'
  | 'admin_approved'
  | 'admin_rejected'
  | 'case_closed'
  | 'resubmitted'

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
  caseId: string
  userId: string
  employeeId: string | null
  
  // State
  currentState: OnboardingState
  
  // Step tracking
  personalInfoCompleted: boolean
  bankingInfoCompleted: boolean
  contractCompleted: boolean
  managerAssigned: boolean
  
  // Timestamps
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
  
  // Admin review
  rejectionReason: string | null
  reviewedBy: string | null
  reviewerName: string | null
  
  // Personal info
  personalInfo: PersonalInfoPayload | null
  
  // Banking info (limited for security)
  bankingInfo: BankingInfoDisplay | null
  
  // Contract info
  contractInfo: ContractInfoPayload | null
  
  // Manager
  managerName: string | null
  
  // Progress
  progress: OnboardingProgress
}

export interface PersonalInfoPayload {
  full_name: string
  address: string
  city: string
  state_parish: string
  country: string
  zip_code: string
  phone: string
  email: string
  date_of_birth?: string
  preferred_start_date?: string
}

export interface BankingInfoPayload {
  bank_name: string
  bank_address: string
  branch?: string
  account_number_encrypted: string // NOTE: Should be encrypted in production
  account_type: string
  swift_code?: string
  aba_wire_routing?: string
  currency: string
}

export interface BankingInfoDisplay {
  bank_name: string
  account_type: string
  currency: string
  last_four?: string // Only show last 4 digits
}

export interface ContractInfoPayload {
  employment_type: string
  position_title: string
  department?: string
  rate: number
  rate_type: string
  currency: string
  start_date: string
  end_date?: string
  manager_id?: string
}

export interface OnboardingEvent {
  id: string
  case_id: string
  event_type: OnboardingEventType
  actor_user_id: string | null
  payload: Record<string, any>
  created_at: string
}

// =====================================================
// Helper Functions
// =====================================================

function computeProgress(
  caseData: any,
  personal: any,
  banking: any,
  contract: any
): OnboardingProgress {
  const progress: OnboardingProgress = {
    step1_submit_request: true, // Case exists
    step2_personal_info: !!personal?.completed_at,
    step3_banking_info: !!banking?.completed_at && !!caseData.submitted_at,
    step4_admin_approval: caseData.current_state === 'approved',
    step5_contract_complete: !!contract?.completed_at,
    step6_manager_assigned: !!contract?.manager_id,
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

function transformToOnboardingData(caseData: any): OnboardingData {
  const personal = caseData.personal?.[0] || null
  const banking = caseData.banking?.[0] || null
  const contract = caseData.contract?.[0] || null
  const reviewer = caseData.reviewer || null
  const manager = contract?.manager || null
  
  return {
    caseId: caseData.id,
    userId: caseData.user_id,
    employeeId: caseData.employee_id,
    
    currentState: caseData.current_state,
    
    personalInfoCompleted: !!personal?.completed_at,
    bankingInfoCompleted: !!banking?.completed_at,
    contractCompleted: !!contract?.completed_at,
    managerAssigned: !!contract?.manager_id,
    
    submittedAt: caseData.submitted_at,
    approvedAt: caseData.approved_at,
    rejectedAt: caseData.rejected_at,
    createdAt: caseData.created_at,
    updatedAt: caseData.updated_at,
    
    rejectionReason: caseData.rejection_reason,
    reviewedBy: caseData.reviewed_by,
    reviewerName: reviewer?.name || null,
    
    personalInfo: personal ? {
      full_name: personal.full_name,
      address: personal.address,
      city: personal.city,
      state_parish: personal.state_parish,
      country: personal.country,
      zip_code: personal.zip_code,
      phone: personal.phone,
      email: personal.email,
      date_of_birth: personal.date_of_birth,
      preferred_start_date: personal.preferred_start_date,
    } : null,
    
    bankingInfo: banking ? {
      bank_name: banking.bank_name,
      account_type: banking.account_type,
      currency: banking.currency,
      // TODO: Extract last 4 digits from encrypted account number
    } : null,
    
    contractInfo: contract ? {
      employment_type: contract.employment_type,
      position_title: contract.position_title,
      department: contract.department,
      rate: contract.rate,
      rate_type: contract.rate_type,
      currency: contract.currency,
      start_date: contract.start_date,
      end_date: contract.end_date,
      manager_id: contract.manager_id,
    } : null,
    
    managerName: manager?.name || null,
    
    progress: computeProgress(caseData, personal, banking, contract),
  }
}

// =====================================================
// Employee Operations
// =====================================================

/**
 * Get onboarding status for current user
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingData | null> {
  console.log('[DAL] Fetching onboarding status for user_id:', userId)
  
  const { data: caseData, error } = await supabase
    .from('onboarding_cases')
    .select(`
      *,
      personal:onboarding_personal(*),
      banking:onboarding_banking(bank_name, account_type, currency, completed_at),
      contract:onboarding_contract(*,manager:manager_id(name)),
      reviewer:reviewed_by(name)
    `)
    .eq('user_id', userId)
    .maybeSingle() // Changed from .single() - returns null if not found (no 406)
  
  if (error) {
    console.error('[DAL] Error fetching onboarding status:', error)
    return null
  }
  
  if (!caseData) {
    console.log('[DAL] No onboarding case found for user - needs to start onboarding')
    return null
  }
  
  console.log('[DAL] Onboarding case found:', { case_id: caseData.id, state: caseData.current_state })
  return transformToOnboardingData(caseData)
}

/**
 * Get onboarding status by case ID (for admins)
 */
export async function getOnboardingStatusByCase(caseId: string): Promise<OnboardingData | null> {
  const { data: caseData, error } = await supabase
    .from('onboarding_cases')
    .select(`
      *,
      personal:onboarding_personal(*),
      banking:onboarding_banking(*),
      contract:onboarding_contract(*,manager:manager_id(name)),
      reviewer:reviewed_by(name)
    `)
    .eq('id', caseId)
    .maybeSingle() // Changed from .single() to handle not found gracefully
  
  if (error) {
    console.error('[DAL] Error fetching onboarding case:', error)
    return null
  }
  
  if (!caseData) {
    console.log('[DAL] No onboarding case found for case_id:', caseId)
    return null
  }
  
  return transformToOnboardingData(caseData)
}

/**
 * Create new onboarding case - IDEMPOTENT (get or create)
 * If case already exists, returns existing case.
 * If not, creates new case.
 */
export async function createOnboardingCase(userId: string): Promise<{ success: boolean; caseId?: string; error?: string }> {
  try {
    console.log('[DAL] createOnboardingCase - checking for existing case for userId:', userId)
    
    // 1. Check if case already exists
    const { data: existingCase, error: fetchError } = await supabase
      .from('onboarding_cases')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (fetchError) {
      console.error('[DAL] Error checking for existing case:', fetchError)
      throw fetchError
    }
    
    if (existingCase) {
      console.log('[DAL] Onboarding case already exists:', existingCase.id)
      return { success: true, caseId: existingCase.id }
    }
    
    // 2. Create new case if doesn't exist
    console.log('[DAL] Creating new onboarding case for userId:', userId)
    const { data: newCase, error: createError } = await supabase
      .from('onboarding_cases')
      .insert({
        user_id: userId,
        current_state: 'draft',
      })
      .select('id')
      .single()
    
    if (createError) {
      // If we get a unique constraint violation (23505), another request may have created it
      // Try fetching again
      if (createError.code === '23505') {
        console.log('[DAL] Unique constraint - re-fetching case')
        const { data: retryCase } = await supabase
          .from('onboarding_cases')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (retryCase) {
          console.log('[DAL] Found case on retry:', retryCase.id)
          return { success: true, caseId: retryCase.id }
        }
      }
      throw createError
    }
    
    console.log('[DAL] New onboarding case created:', newCase.id)
    
    // 3. Create initial event
    await supabase
      .from('onboarding_events')
      .insert({
        case_id: newCase.id,
        event_type: 'case_created',
        actor_user_id: userId,
        payload: {},
      })
    
    return { success: true, caseId: newCase.id }
  } catch (error: any) {
    console.error('[DAL] Error in createOnboardingCase:', error)
    return {
      success: false,
      error: error.message || 'Failed to create onboarding case',
    }
  }
}

/**
 * Save personal information (Step 2)
 */
export async function savePersonalInfo(
  userId: string,
  payload: PersonalInfoPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get case ID
    const { data: caseData } = await supabase
      .from('onboarding_cases')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (!caseData) {
      return { success: false, error: 'Onboarding case not found' }
    }
    
    // Upsert personal info
    const { error } = await supabase
      .from('onboarding_personal')
      .upsert({
        case_id: caseData.id,
        ...payload,
        completed_at: new Date().toISOString(),
      })
    
    if (error) throw error
    
    // Create event
    await supabase
      .from('onboarding_events')
      .insert({
        case_id: caseData.id,
        event_type: 'personal_updated',
        actor_user_id: userId,
        payload: { fields: Object.keys(payload) },
      })
    
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
 * Save banking information (Step 3)
 */
export async function saveBankingInfo(
  userId: string,
  payload: BankingInfoPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get case ID
    const { data: caseData } = await supabase
      .from('onboarding_cases')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (!caseData) {
      return { success: false, error: 'Onboarding case not found' }
    }
    
    // TODO: Encrypt account_number_encrypted in production using pgcrypto
    
    // Upsert banking info
    const { error } = await supabase
      .from('onboarding_banking')
      .upsert({
        case_id: caseData.id,
        ...payload,
        completed_at: new Date().toISOString(),
      })
    
    if (error) throw error
    
    // Create event
    await supabase
      .from('onboarding_events')
      .insert({
        case_id: caseData.id,
        event_type: 'banking_updated',
        actor_user_id: userId,
        payload: { bank_name: payload.bank_name },
      })
    
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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get case with personal and banking info
    const { data: caseData } = await supabase
      .from('onboarding_cases')
      .select(`
        id,
        personal:onboarding_personal(completed_at),
        banking:onboarding_banking(completed_at)
      `)
      .eq('user_id', userId)
      .single()
    
    if (!caseData) {
      return { success: false, error: 'Onboarding case not found' }
    }
    
    // Verify both personal and banking are completed
    const personal = caseData.personal?.[0]
    const banking = caseData.banking?.[0]
    
    if (!personal?.completed_at || !banking?.completed_at) {
      return {
        success: false,
        error: 'Please complete both personal and banking information first',
      }
    }
    
    // Update case to submitted
    const { error } = await supabase
      .from('onboarding_cases')
      .update({
        current_state: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', caseData.id)
    
    if (error) throw error
    
    // Create event
    await supabase
      .from('onboarding_events')
      .insert({
        case_id: caseData.id,
        event_type: 'submitted',
        actor_user_id: userId,
        payload: {},
      })
    
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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: caseData } = await supabase
      .from('onboarding_cases')
      .select('id, current_state')
      .eq('user_id', userId)
      .single()
    
    if (!caseData || caseData.current_state !== 'rejected') {
      return { success: false, error: 'Case is not in rejected state' }
    }
    
    const { error } = await supabase
      .from('onboarding_cases')
      .update({
        current_state: 'submitted',
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
        rejected_at: null,
      })
      .eq('id', caseData.id)
    
    if (error) throw error
    
    // Create event
    await supabase
      .from('onboarding_events')
      .insert({
        case_id: caseData.id,
        event_type: 'resubmitted',
        actor_user_id: userId,
        payload: {},
      })
    
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
  const { data: cases, error } = await supabase
    .from('onboarding_cases')
    .select(`
      *,
      personal:onboarding_personal(*),
      banking:onboarding_banking(bank_name, account_type, currency, completed_at),
      contract:onboarding_contract(*,manager:manager_id(name)),
      reviewer:reviewed_by(name)
    `)
    .not('current_state', 'in', '(approved,closed)')
    .order('submitted_at', { ascending: false, nullsFirst: false })
  
  if (error) {
    console.error('Error fetching onboarding queue:', error)
    return []
  }
  
  return cases.map(transformToOnboardingData)
}

/**
 * Approve employee onboarding (uses DB function)
 */
export async function adminApproveOnboarding(
  caseId: string,
  managerId: string,
  contractInfo: ContractInfoPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('approve_onboarding', {
      p_case_id: caseId,
      p_manager_employee_id: managerId,
      p_contract: contractInfo as any,
    })
    
    if (error) throw error
    
    const result = data?.[0]
    if (!result?.success) {
      return { success: false, error: result?.message || 'Approval failed' }
    }
    
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
 * Reject employee onboarding (uses DB function)
 */
export async function adminRejectOnboarding(
  caseId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason?.trim()) {
    return { success: false, error: 'Rejection reason is required' }
  }
  
  try {
    const { data, error } = await supabase.rpc('reject_onboarding', {
      p_case_id: caseId,
      p_rejection_reason: reason,
    })
    
    if (error) throw error
    
    const result = data?.[0]
    if (!result?.success) {
      return { success: false, error: result?.message || 'Rejection failed' }
    }
    
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
 * Get onboarding events (audit trail)
 */
export async function getOnboardingEvents(caseId: string): Promise<OnboardingEvent[]> {
  const { data: events, error } = await supabase
    .from('onboarding_events')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching onboarding events:', error)
    return []
  }
  
  return events || []
}

/**
 * Check if employee can submit timesheets (approved + active)
 */
export async function canSubmitTimesheets(userId: string): Promise<boolean> {
  // Check if user has an active employee record
  const { data: employee, error } = await supabase
    .from('employees')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle() // Changed from .single() to handle null gracefully
  
  if (error) {
    console.error('[DAL] Error checking timesheet permission:', error)
    return false
  }
  
  // Only allow if employee exists and status is active
  return employee?.status === 'active'
}

/**
 * Legacy compatibility: Get onboarding by employee ID
 * (for backward compatibility with existing UI code)
 */
export async function getOnboardingStatusByEmployeeId(employeeId: string): Promise<OnboardingData | null> {
  const { data: employee, error } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .maybeSingle() // Changed from .single() to handle not found gracefully
  
  if (error) {
    console.error('[DAL] Error fetching employee for onboarding lookup:', error)
    return null
  }
  
  if (!employee || !employee.user_id) {
    return null
  }
  
  return getOnboardingStatus(employee.user_id)
}
