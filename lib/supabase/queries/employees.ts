import { supabase } from '../client'
import type { Employee } from '@/types/domain'

/**
 * Get all employees not currently in a manager's team
 */
export async function getAvailableEmployees(managerId: string) {
  // First, get all employee IDs that are already on this manager's team
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('employee_id')
    .eq('manager_id', managerId)

  if (teamError) {
    console.error('Error fetching team members:', teamError)
    throw teamError
  }

  const teamEmployeeIds = teamMembers?.map((tm) => tm.employee_id) || []

  // Get all employees that are not in the team (or empty array if all are in team)
  let query = supabase.from('employees').select('*').eq('role', 'employee')

  if (teamEmployeeIds.length > 0) {
    // Use proper Supabase syntax for NOT IN
    query = query.not('id', 'in', `(${teamEmployeeIds.map(id => `"${id}"`).join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching available employees:', error)
    throw error
  }

  return data as Employee[]
}

/**
 * Get employee by ID with full profile
 */
export async function getEmployeeById(employeeId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  if (error) {
    console.error('Error fetching employee:', error)
    throw error
  }

  return data as Employee
}

/**
 * Update employee profile
 */
export async function updateEmployeeProfile(employeeId: string, profileData: {
  name?: string
  email?: string
  onboarding_status?: 'not_started' | 'in_progress' | 'completed'
  address?: string
  state_parish?: string
  country?: string
  zip_postal_code?: string
  phone?: string
  bank_name?: string
  bank_address?: string
  swift_code?: string
  aba_wire_routing?: string
  account_type?: string
  currency?: string
  account_number?: string
  active_project?: string
  hourly_rate?: number | null
  project_types?: string[]
}) {
  const { data, error } = await supabase
    .from('employees')
    .update(profileData)
    .eq('id', employeeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating employee profile:', error)
    throw error
  }

  return data as Employee
}

