import { NextRequest, NextResponse } from 'next/server'
import { removeEmployeeFromTeam, getTeamMemberById } from '@/lib/supabase/queries/team'
import { createNotification } from '@/lib/supabase/queries/notifications'

/**
 * API route to remove employee from manager's team
 * POST /api/team/[id]/remove
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { managerId } = await request.json()

    if (!managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      )
    }

    // Get team member info before removing
    const teamMember = await getTeamMemberById(params.id)

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Remove employee from team
    await removeEmployeeFromTeam(params.id)

    // TODO: Get manager name from auth/session
    const managerName = 'Your Manager' // This should come from session

    // Create notification for employee
    await createNotification(
      teamMember.employee_id,
      'team_removed',
      'Removed from Team',
      `You have been removed from ${managerName}'s team.`,
      null
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing employee from team:', error)
    return NextResponse.json(
      { error: 'Failed to remove employee from team' },
      { status: 500 }
    )
  }
}

