import { supabase } from '../client'
import type { TeamMember } from '@/types/domain'

/**
 * Get all team members for a manager with employee details
 */
export async function getManagerTeam(managerId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      employee:employees!team_members_employee_id_fkey (
        id,
        name,
        email
      ),
      project:projects!team_members_project_id_fkey (
        id,
        name
      )
    `)
    .eq('manager_id', managerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching manager team:', error)
    throw error
  }

  return data as (TeamMember & {
    employee: { id: string; name: string; email: string }
    project: { id: string; name: string } | null
  })[]
}

/**
 * Add employee to manager's team
 */
export async function addEmployeeToTeam(
  managerId: string,
  employeeId: string,
  projectId: string | null,
  projectName: string | null,
  contractStart: string,
  contractEnd: string
) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      manager_id: managerId,
      employee_id: employeeId,
      project_id: projectId,
      project_name: projectName,
      contract_start: contractStart,
      contract_end: contractEnd,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding employee to team:', error)
    throw error
  }

  return data as TeamMember
}

/**
 * Remove employee from manager's team
 */
export async function removeEmployeeFromTeam(teamMemberId: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', teamMemberId)

  if (error) {
    console.error('Error removing employee from team:', error)
    throw error
  }
}

/**
 * Get team member by ID
 */
export async function getTeamMemberById(teamMemberId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      employee:employees!team_members_employee_id_fkey (
        id,
        name,
        email
      )
    `)
    .eq('id', teamMemberId)
    .single()

  if (error) {
    console.error('Error fetching team member:', error)
    throw error
  }

  return data
}

