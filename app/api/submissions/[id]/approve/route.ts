import { NextRequest, NextResponse } from 'next/server'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { validateManagerApprove } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'

/**
 * API route to approve a submission (Manager action)
 * POST /api/submissions/[id]/approve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { managerId, comment } = await request.json()

    if (!managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      )
    }

    // Get submission with employee details
    const submission = await getSubmissionById(id)

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    const currentStatus = (submission.status as SubmissionStatus) || 'SUBMITTED'
    const transition = validateManagerApprove(currentStatus)
    
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.error },
        { status: 400 }
      )
    }

    // Update submission status using centralized status
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: transition.newStatus,
        manager_comment: comment || null,
        acted_by_manager_id: managerId,
        acted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    const submissionDateLabel = format(
      new Date(submission.submission_date),
      'MMM dd, yyyy'
    )

    // Notify employee
    await createNotification({
      userId: submission.employee_id,
      role: 'EMPLOYEE',
      type: 'HOURS_APPROVED',
      title: 'Hours approved',
      message: `Your hours for ${submissionDateLabel} were approved.`,
      entityType: 'SUBMISSION',
      entityId: id,
      metadata: {
        managerId,
      },
    })

    // Notify admin that a submission is ready for processing
    try {
      const { data: admins, error: adminError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)

      const adminId = !adminError && admins && admins.length > 0 ? admins[0].id : null

      if (adminId && submission.employee?.name) {
        await createNotification({
          userId: adminId,
          role: 'ADMIN',
          type: 'HOURS_APPROVED',
          title: 'Submission ready for processing',
          message: `${submission.employee.name}'s submission for ${submissionDateLabel} was approved by manager.`,
          entityType: 'SUBMISSION',
          entityId: id,
          metadata: {
            employeeId: submission.employee_id,
            managerId,
          },
        })
      }
    } catch (notifError) {
      console.error('Error creating admin approval notification:', notifError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving submission:', error)
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    )
  }
}
