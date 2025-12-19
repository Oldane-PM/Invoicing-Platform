import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/admin/submissions/sync-managers
 * 
 * Backfill/sync all submissions to have the correct manager_id based on the
 * employee's current team membership. This is useful for:
 * 1. Initial data migration
 * 2. Fixing any submissions with null or incorrect manager_id
 * 
 * This endpoint syncs submissions.manager_id with team_members.manager_id
 * for all employees.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get all team memberships
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('employee_id, manager_id')
      .order('created_at', { ascending: false })

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json(
        { error: 'Failed to fetch team memberships' },
        { status: 500 }
      )
    }

    // Create a map of employee_id -> manager_id (use most recent team membership)
    const employeeManagerMap = new Map<string, string>()
    for (const tm of teamMembers || []) {
      if (!employeeManagerMap.has(tm.employee_id) && tm.manager_id) {
        employeeManagerMap.set(tm.employee_id, tm.manager_id)
      }
    }

    let updatedCount = 0
    let errorCount = 0

    // Update submissions for each employee
    for (const [employeeId, managerId] of employeeManagerMap) {
      const { error: updateError, count } = await supabaseAdmin
        .from('submissions')
        .update({ 
          manager_id: managerId,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .neq('manager_id', managerId) // Only update if different
        .select('id', { count: 'exact' })

      if (updateError) {
        console.error(`Error updating submissions for employee ${employeeId}:`, updateError)
        errorCount++
      } else if (count && count > 0) {
        updatedCount += count
        console.log(`Updated ${count} submissions for employee ${employeeId} to manager ${managerId}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Manager sync completed`,
      details: {
        employeesProcessed: employeeManagerMap.size,
        submissionsUpdated: updatedCount,
        errors: errorCount
      }
    })
  } catch (error) {
    console.error('Error in sync managers route:', error)
    return NextResponse.json(
      { error: 'Failed to sync managers' },
      { status: 500 }
    )
  }
}

