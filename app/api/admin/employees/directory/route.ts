import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/admin/employees/directory
 * Get all employees with full details for the Employee Directory page
 */
export async function GET() {
  try {

    // Fetch all employees (non-admins) with available columns
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, hourly_rate, active_project, role, created_at')
      .neq('role', 'admin')
      .order('name', { ascending: true })

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    // Fetch team member info for contract details (including manager relationships)
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select(`
        id,
        employee_id,
        manager_id,
        project_id,
        project_name,
        contract_start,
        contract_end,
        manager:employees!team_members_manager_id_fkey (
          id,
          name
        )
      `)

    if (teamError) {
      console.error('Error fetching team members:', teamError)
    }

    // Create a map of employee_id to their team member info
    const teamMemberMap = new Map<string, any>()
    if (teamMembers) {
      for (const tm of teamMembers) {
        // If an employee is in multiple teams, use the most recent one
        const existing = teamMemberMap.get(tm.employee_id)
        if (!existing || (tm.contract_start && existing.contract_start && new Date(tm.contract_start) > new Date(existing.contract_start))) {
          teamMemberMap.set(tm.employee_id, tm)
        } else if (!existing) {
          teamMemberMap.set(tm.employee_id, tm)
        }
      }
    }


    // Map employees with extended info
    const employeesWithDetails = (employees || []).map((emp) => {
      const teamInfo = teamMemberMap.get(emp.id)
      
      // Determine contract type based on role or project
      let contractType = 'Internal Project' // default
      if (emp.role === 'manager') {
        contractType = 'Operational'
      } else if (teamInfo?.project_name) {
        // Use project name to determine type
        const projectName = teamInfo.project_name.toLowerCase()
        if (projectName.includes('client') || projectName.includes('external')) {
          contractType = 'Client Facing Project'
        } else if (projectName.includes('intern')) {
          contractType = 'Intern'
        } else if (projectName.includes('ops') || projectName.includes('operation')) {
          contractType = 'Operational'
        }
      }

      // Determine rate type - default to hourly if they have an hourly_rate
      const rateType = emp.hourly_rate ? 'hourly' : 'fixed'
      
      // Estimate monthly rate as 160 hours * hourly rate
      const monthlyRate = emp.hourly_rate ? emp.hourly_rate * 160 : 5000

      // Extract manager name - handle both object and array formats from Supabase
      let managerName = null
      if (teamInfo?.manager) {
        // Could be an object or an array depending on Supabase response
        if (Array.isArray(teamInfo.manager)) {
          managerName = teamInfo.manager[0]?.name || null
        } else {
          managerName = teamInfo.manager.name || null
        }
      }

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        contract_start_date: teamInfo?.contract_start || emp.created_at || null,
        contract_end_date: teamInfo?.contract_end || null,
        rate_type: rateType as 'hourly' | 'fixed',
        hourly_rate: emp.hourly_rate || null,
        monthly_rate: monthlyRate,
        overtime_rate: emp.hourly_rate ? Math.round(emp.hourly_rate * 1.5) : null,
        position: teamInfo?.project_name || emp.active_project || 'Team Member',
        contract_type: contractType,
        reporting_manager_id: teamInfo?.manager_id || null,
        reporting_manager_name: managerName,
        status: 'active', // Default to active since we don't have status column
        role: emp.role,
      }
    })

    return NextResponse.json({ employees: employeesWithDetails })
  } catch (error) {
    console.error('Error in admin employees directory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
