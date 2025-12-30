/**
 * Data Access Layer: Employees (FIXED for user_id queries)
 * 
 * All employee-related database operations go through this module.
 * 
 * IMPORTANT: This module correctly handles auth user_id vs employee PK id distinction.
 */

import { supabase } from '@/lib/supabase/client'

export interface Employee {
  id: string
  user_id?: string | null
  name: string
  email: string
  role: string
  status: string
  hourly_rate?: number | null
  overtime_rate?: number | null
  monthly_rate?: number | null
  position?: string | null
  contract_type?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  rate_type?: string | null
  reporting_manager_id?: string | null
  active_project?: string | null
  onboarding_status?: string | null
  country?: string | null
  region?: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeFilters {
  role?: string
  status?: string
  contractType?: string
  managerId?: string
  search?: string
}

// ============================================
// GET EMPLOYEE BY USER_ID (for auth lookups)
// ============================================
/**
 * Fetch employee record by Supabase auth user_id
 * This is the PRIMARY method for auth-based employee lookups
 * 
 * @param userId - Supabase auth.users.id (UUID)
 * @returns Employee or null if not found (handles onboarding state)
 */
export async function getEmployeeByUserId(userId: string): Promise<Employee | null> {
  console.log('[DAL] Fetching employee by user_id:', userId)
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() // Returns null if not found (not an error)

  if (error) {
    console.error('[DAL] Error fetching employee by user_id:', error)
    throw new Error(`Failed to fetch employee: ${error.message}`)
  }

  if (!data) {
    console.log('[DAL] No employee record found for user_id:', userId)
    return null
  }

  console.log('[DAL] Employee found:', { id: data.id, name: data.name, status: data.status })
  return data
}

// ============================================
// GET EMPLOYEE BY ID (for internal queries)
// ============================================
/**
 * Fetch employee record by employee PK id
 * Only use this when you have the actual employee row ID
 * 
 * @param employeeId - employees.id (UUID, not auth user id)
 * @returns Employee or null if not found
 */
export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle() // Changed from .single() to handle not found gracefully

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('[DAL] Error fetching employee by id:', error)
    throw new Error(`Failed to fetch employee: ${error.message}`)
  }

  return data
}

// ============================================
// LIST ALL EMPLOYEES
// ============================================
export async function listEmployees(filters?: EmployeeFilters): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true })

  if (filters?.role && filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.managerId && filters.managerId !== 'all') {
    query = query.eq('reporting_manager_id', filters.managerId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[DAL] Error fetching employees:', error)
    throw new Error(`Failed to fetch employees: ${error.message}`)
  }

  return data || []
}

// ============================================
// GET MANAGERS LIST
// ============================================
export interface ManagerOption {
  id: string
  name: string
  email: string
  role: string
}

export async function listManagers(): Promise<ManagerOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email, role')
    .in('role', ['manager', 'admin', 'MANAGER', 'ADMIN'])
    .order('name', { ascending: true })

  if (error) {
    console.error('[DAL] Error fetching managers:', error)
    throw new Error(`Failed to fetch managers: ${error.message}`)
  }

  return data || []
}

// ============================================
// UPDATE EMPLOYEE
// ============================================
export async function updateEmployee(
  employeeId: string,
  payload: Partial<Employee>
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .select()
    .single()

  if (error) {
    console.error('[DAL] Error updating employee:', error)
    throw new Error(`Failed to update employee: ${error.message}`)
  }

  return data
}

// ============================================
// GET TEAM (FOR MANAGER)
// ============================================
export async function getTeamByManager(managerId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('reporting_manager_id', managerId)
    .order('name', { ascending: true })

  if (error) {
    console.error('[DAL] Error fetching team:', error)
    throw new Error(`Failed to fetch team: ${error.message}`)
  }

  return data || []
}

// ============================================
// COUNT EMPLOYEES (FOR FILTERS)
// ============================================
export async function countEmployees(filters?: {
  projectIds?: string[]
  employeeTypes?: string[]
  countries?: string[]
  regions?: string[]
}): Promise<number> {
  let query = supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })

  const { count, error } = await query

  if (error) {
    console.error('[DAL] Error counting employees:', error)
    throw new Error(`Failed to count employees: ${error.message}`)
  }

  return count || 0
}

// ============================================
// CHECK EMPLOYEE STATUS BY USER_ID
// ============================================
/**
 * Quick status check for timesheet gates, etc.
 * 
 * @param userId - Supabase auth user id
 * @returns Status string or null if no employee record
 */
export async function getEmployeeStatus(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[DAL] Error fetching employee status:', error)
    return null
  }

  return data?.status || null
}

