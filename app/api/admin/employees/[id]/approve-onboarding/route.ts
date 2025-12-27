import { NextRequest, NextResponse } from 'next/server'
import { adminApproveOnboarding } from '@/lib/data/onboarding'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/employees/[id]/approve-onboarding
 * Approve an employee's onboarding submission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id
    const body = await request.json()
    const { adminId } = body

    // Validate required fields
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Verify employee exists and get their current status
    const supabase = getSupabaseAdmin()
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, admin_approval_status, personal_info_completed_at, banking_info_completed_at, onboarding_submitted_at')
      .eq('id', employeeId)
      .single()

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if already approved
    if (employee.admin_approval_status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Employee has already been approved' },
        { status: 409 }
      )
    }

    // Check if waiting for approval
    if (employee.admin_approval_status !== 'WAITING') {
      return NextResponse.json(
        { 
          error: 'Employee onboarding must be in WAITING status to approve',
          currentStatus: employee.admin_approval_status 
        },
        { status: 400 }
      )
    }

    // Validate prerequisites
    if (!employee.personal_info_completed_at) {
      return NextResponse.json(
        { error: 'Personal information must be completed before approval' },
        { status: 400 }
      )
    }

    if (!employee.banking_info_completed_at) {
      return NextResponse.json(
        { error: 'Banking information must be completed before approval' },
        { status: 400 }
      )
    }

    if (!employee.onboarding_submitted_at) {
      return NextResponse.json(
        { error: 'Onboarding must be submitted before approval' },
        { status: 400 }
      )
    }

    // Approve the onboarding
    const result = await adminApproveOnboarding(employeeId, adminId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to approve onboarding' },
        { status: 500 }
      )
    }

    // Fetch updated employee data
    const { data: updatedEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    return NextResponse.json({
      success: true,
      message: `${employee.name}'s onboarding has been approved`,
      employee: updatedEmployee,
    })
  } catch (error) {
    console.error('Error approving onboarding:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while approving onboarding' },
      { status: 500 }
    )
  }
}

