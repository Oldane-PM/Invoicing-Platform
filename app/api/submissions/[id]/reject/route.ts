import { NextRequest, NextResponse } from 'next/server'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { validateManagerReject, validateAdminReject } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'

/**
 * API route to reject a submission
 * POST /api/submissions/[id]/reject
 * 
 * Can be called by Manager or Admin with different status transitions:
 * - Manager: SUBMITTED → MANAGER_REJECTED
 * - Admin: MANAGER_APPROVED → ADMIN_REJECTED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { managerId, rejectionReason, isAdminAction } = await request.json()

    console.log('Reject request:', { id, managerId, rejectionReason, isAdminAction })

    if (!managerId) {
      return NextResponse.json(
        { error: 'Actor ID is required' },
        { status: 400 }
      )
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
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

    const currentStatus = (submission.status as SubmissionStatus) || 'SUBMITTED'
    const isAdmin = isAdminAction || managerId === 'admin'

    // Validate status transition based on actor
    let transition
    if (isAdmin) {
      transition = validateAdminReject(currentStatus)
    } else {
      transition = validateManagerReject(currentStatus)
    }

    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.error },
        { status: 400 }
      )
    }

    // Update submission with appropriate comment field
    const updateData: Record<string, any> = {
      status: transition.newStatus,
      acted_by_manager_id: managerId,
      acted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isAdmin) {
      updateData.admin_comment = rejectionReason.trim()
    } else {
      updateData.manager_comment = rejectionReason.trim()
    }

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    const submissionDateLabel = format(
      new Date(submission.submission_date),
      'MMM dd, yyyy'
    )

    if (isAdmin) {
      // Admin rejects → notify Employee + Manager
      await createNotification({
        userId: submission.employee_id,
        role: 'EMPLOYEE',
        type: 'HOURS_REJECTED_ADMIN',
        title: 'Hours rejected by Admin',
        message: `Your hours for ${submissionDateLabel} were rejected by Admin. Reason: "${rejectionReason}".`,
        entityType: 'SUBMISSION',
        entityId: id,
      })

      if (submission.manager_id) {
        await createNotification({
          userId: submission.manager_id,
          role: 'MANAGER',
          type: 'HOURS_REJECTED_ADMIN',
          title: 'Submission rejected by Admin',
          message: `The submission for ${submissionDateLabel} was rejected by Admin. Reason: "${rejectionReason}".`,
          entityType: 'SUBMISSION',
          entityId: id,
        })
      }
    } else {
      // Manager rejects → notify Employee
      await createNotification({
        userId: submission.employee_id,
        role: 'EMPLOYEE',
        type: 'HOURS_REJECTED_MANAGER',
        title: 'Hours rejected',
        message: `Your hours for ${submissionDateLabel} were rejected. Reason: "${rejectionReason}".`,
        entityType: 'SUBMISSION',
        entityId: id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting submission:', error)
    return NextResponse.json(
      { error: 'Failed to reject submission' },
      { status: 500 }
    )
  }
}
