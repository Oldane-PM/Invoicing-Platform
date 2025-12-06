import { NextRequest, NextResponse } from 'next/server'
import { addEmployeeToTeam } from '@/lib/supabase/queries/team'
import { createNotification } from '@/lib/notifications'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

/**
 * API route to add employee to manager's team
 * POST /api/team/add
 * 
 * Supports two modes:
 * 1. Adding existing employee by ID: { managerId, employeeId, contractStart, contractEnd }
 * 2. Creating new employee: { managerId, employeeName, employeeEmail }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { managerId, employeeId, employeeName, employeeEmail, projectId, projectName, contractStart, contractEnd } = body

    if (!managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    let finalEmployeeId: string

    // Mode 1: Adding existing employee by ID
    if (employeeId) {
      finalEmployeeId = employeeId
    }
    // Mode 2: Creating new employee by name/email
    else if (employeeName && employeeEmail) {
      // Check if employee with this email already exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('email', employeeEmail)
        .single()

      if (existingEmployee) {
        // Use existing employee
        finalEmployeeId = existingEmployee.id
      } else {
        // Create new employee
        const newEmployeeId = uuidv4()
        const { error: createError } = await supabase
          .from('employees')
          .insert({
            id: newEmployeeId,
            name: employeeName,
            email: employeeEmail,
            hourly_rate: 0,
            status: 'active',
          })

        if (createError) {
          console.error('Error creating employee:', createError)
          return NextResponse.json(
            { error: 'Failed to create employee' },
            { status: 500 }
          )
        }

        finalEmployeeId = newEmployeeId
      }
    } else {
      return NextResponse.json(
        { error: 'Either employeeId or (employeeName and employeeEmail) is required' },
        { status: 400 }
      )
    }

    // Check if employee is already on this team
    const { data: existingTeamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('manager_id', managerId)
      .eq('employee_id', finalEmployeeId)
      .single()

    if (existingTeamMember) {
      return NextResponse.json(
        { error: 'This employee is already on your team' },
        { status: 400 }
      )
    }

    // Use provided dates or default to 1 year contract
    const finalContractStart = contractStart || new Date().toISOString().split('T')[0]
    const finalContractEnd = contractEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    await addEmployeeToTeam(
      managerId,
      finalEmployeeId,
      projectId || null,
      projectName || null,
      finalContractStart,
      finalContractEnd
    )

    // Create notification for employee
    try {
      await createNotification({
        userId: finalEmployeeId,
        role: 'EMPLOYEE',
        type: 'TEAM_ADDED',
        title: 'Added to team',
        message: `You have been added to a manager's team.`,
        entityType: 'TEAM',
        entityId: managerId,
      })
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding employee to team:', error)
    return NextResponse.json(
      { error: 'Failed to add employee to team' },
      { status: 500 }
    )
  }
}
