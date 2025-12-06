import { NextRequest, NextResponse } from 'next/server'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { validateAdminRequestClarification } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'

/**
 * API route to request clarification for a submission (Admin action)
 * POST /api/submissions/[id]/request-clarification
 * 
 * Transition: MANAGER_APPROVED → NEEDS_CLARIFICATION
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminId, message } = await request.json()

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Clarification message is required' },
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
    const transition = validateAdminRequestClarification(currentStatus)

    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.error },
        { status: 400 }
      )
    }

    // Update submission status
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: transition.newStatus,
        admin_comment: message.trim(),
        acted_by_manager_id: adminId,
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

    // Notify manager that clarification is needed
    if (submission.manager_id) {
      await createNotification({
        userId: submission.manager_id,
        role: 'MANAGER',
        type: 'HOURS_CLARIFICATION_ADMIN',
        title: 'Clarification requested',
        message: `Admin requested clarification for ${submission.employee?.name || 'employee'}'s submission on ${submissionDateLabel}. Message: "${message}".`,
        entityType: 'SUBMISSION',
        entityId: id,
      })
    }

    // Notify employee that their submission is under review
    await createNotification({
      userId: submission.employee_id,
      role: 'EMPLOYEE',
      type: 'HOURS_CLARIFICATION_ADMIN',
      title: 'Submission under review',
      message: `Your submission for ${submissionDateLabel} is under review. Additional clarification has been requested.`,
      entityType: 'SUBMISSION',
      entityId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error requesting clarification:', error)
    return NextResponse.json(
      { error: 'Failed to request clarification' },
      { status: 500 }
    )
  }
}
