import { NextRequest, NextResponse } from 'next/server'
import { deleteSubmission } from '@/lib/supabase/queries/submissions'

/**
 * API route to delete a submission
 * DELETE /api/submissions/[id]/delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { employeeId } = await request.json()

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    await deleteSubmission(params.id, employeeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete submission',
      },
      { status: 500 }
    )
  }
}

