import { NextRequest, NextResponse } from 'next/server'
import { updateSubmissionStatus } from '@/lib/supabase/queries/submissions'
import { createNotification } from '@/lib/supabase/queries/notifications'
import { getSubmissionById } from '@/lib/supabase/queries/submissions'
import { format } from 'date-fns'

/**
 * API route to approve a submission
 * POST /api/submissions/[id]/approve
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

    // Get submission to get employee_id
    const submission = await getSubmissionById(params.id)

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Update submission status
    await updateSubmissionStatus(params.id, 'approved', managerId)

    // Create notification for employee
    const submissionDate = format(
      new Date(submission.submission_date),
      'MMM dd, yyyy'
    )
    await createNotification(
      submission.employee_id,
      'submission_approved',
      'Hours Approved',
      `Your submission for ${submissionDate} has been approved.`,
      params.id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving submission:', error)
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    )
  }
}

