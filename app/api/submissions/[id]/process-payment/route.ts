import { NextRequest, NextResponse } from 'next/server'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { validateAdminProcessPayment } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'

/**
 * API route to process payment for a submission (Admin action)
 * POST /api/submissions/[id]/process-payment
 * 
 * Transition: MANAGER_APPROVED → ADMIN_PAID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminId, paymentReference } = await request.json()

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
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
    const transition = validateAdminProcessPayment(currentStatus)

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
        admin_comment: paymentReference || null,
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

    // Notify employee that payment was processed
    await createNotification({
      userId: submission.employee_id,
      role: 'EMPLOYEE',
      type: 'PAYMENT_PROCESSED',
      title: 'Payment processed',
      message: `Payment for your hours submitted on ${submissionDateLabel} has been processed.`,
      entityType: 'SUBMISSION',
      entityId: id,
    })

    // Optionally notify manager
    if (submission.manager_id) {
      await createNotification({
        userId: submission.manager_id,
        role: 'MANAGER',
        type: 'PAYMENT_PROCESSED',
        title: 'Payment processed',
        message: `Payment for ${submission.employee?.name || 'employee'}'s submission on ${submissionDateLabel} has been processed.`,
        entityType: 'SUBMISSION',
        entityId: id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
