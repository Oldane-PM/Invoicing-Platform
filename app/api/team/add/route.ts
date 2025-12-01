import { NextRequest, NextResponse } from 'next/server'
import { addEmployeeToTeam } from '@/lib/supabase/queries/team'
import { createNotification } from '@/lib/supabase/queries/notifications'
import { getEmployeeById } from '@/lib/supabase/queries/employees'

/**
 * API route to add employee to manager's team
 * POST /api/team/add
 */
export async function POST(request: NextRequest) {
  try {
    const { managerId, employeeId, projectId, projectName, contractStart, contractEnd } =
      await request.json()

    if (!managerId || !employeeId || !contractStart || !contractEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Add employee to team
    await addEmployeeToTeam(
      managerId,
      employeeId,
      projectId,
      projectName,
      contractStart,
      contractEnd
    )

    // Get employee and manager info for notification
    const employee = await getEmployeeById(employeeId)
    // TODO: Get manager name from auth/session
    const managerName = 'Your Manager' // This should come from session

    // Create notification for employee
    await createNotification(
      employeeId,
      'team_added',
      'Added to Team',
      `You have been added to ${managerName}'s team.`,
      null
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding employee to team:', error)
    return NextResponse.json(
      { error: 'Failed to add employee to team' },
      { status: 500 }
    )
  }
}

