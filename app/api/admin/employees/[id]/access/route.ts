import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// Valid roles
const VALID_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const employeeId = params.id
    const body = await request.json()
    const { role, reporting_manager_id } = body

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MANAGER, or EMPLOYEE' },
        { status: 400 }
      )
    }

    // Validate that employee exists
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, role')
      .eq('id', employeeId)
      .single()

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Prevent demoting the last admin (optional safety check)
    if (employee.role === 'admin' && role !== 'ADMIN') {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .neq('id', employeeId)

      if (count === 0) {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining Admin' },
          { status: 400 }
        )
      }
    }

    // Validate reporting manager if role is EMPLOYEE
    if (role === 'EMPLOYEE') {
      if (!reporting_manager_id) {
        return NextResponse.json(
          { error: 'Reporting manager is required for Employee role' },
          { status: 400 }
        )
      }

      // Prevent self-assignment
      if (reporting_manager_id === employeeId) {
        return NextResponse.json(
          { error: 'Cannot assign self as reporting manager' },
          { status: 400 }
        )
      }

      // Verify manager exists and is a manager
      const { data: manager, error: managerError } = await supabase
        .from('employees')
        .select('id, role')
        .eq('id', reporting_manager_id)
        .single()

      if (managerError || !manager) {
        return NextResponse.json(
          { error: 'Reporting manager not found' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      role: role.toLowerCase(), // Store as lowercase in DB
    }

    // Only set reporting_manager_id for EMPLOYEE role
    if (role === 'EMPLOYEE') {
      updateData.reporting_manager_id = reporting_manager_id
    } else {
      // Clear reporting manager for non-employee roles
      updateData.reporting_manager_id = null
    }

    // Update employee
    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)

    if (updateError) {
      console.error('Error updating employee access:', updateError)
      return NextResponse.json(
        { error: 'Failed to update access' },
        { status: 500 }
      )
    }

    // Log the access change (optional - add to status log)
    try {
      await supabase.from('employee_status_log').insert({
        employee_id: employeeId,
        action_type: 'ACCESS_UPDATED',
        action_title: 'Access Control Updated',
        description: `Role changed to ${role}${reporting_manager_id ? ` with manager assignment` : ''}`,
        performed_by: 'Admin', // TODO: Get actual admin user from session
      })
    } catch (logError) {
      // Non-critical - don't fail the request
      console.warn('Failed to log access change:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Access updated successfully',
    })

  } catch (error) {
    console.error('Unexpected error updating access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

