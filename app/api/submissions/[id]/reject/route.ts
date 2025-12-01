import { NextRequest, NextResponse } from 'next/server'
import { updateSubmissionStatus } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/supabase/queries/notifications'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { format } from 'date-fns'

/**
 * API route to reject a submission
 * POST /api/submissions/[id]/reject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { managerId, rejectionReason } = await request.json()

    if (!managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      )
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get submission to get employee_id
    const submission = await getSubmissionById(params.id)

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Update submission status
    await updateSubmissionStatus(
      params.id,
      'rejected',
      managerId,
      rejectionReason
    )

    // Create notification for employee
    const submissionDate = format(
      new Date(submission.submission_date),
      'MMM dd, yyyy'
    )
    await createNotification(
      submission.employee_id,
      'submission_rejected',
      'Hours Rejected',
      `Your submission for ${submissionDate} was rejected. Reason: ${rejectionReason}`,
      params.id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting submission:', error)
    return NextResponse.json(
      { error: 'Failed to reject submission' },
      { status: 500 }
    )
  }
}

