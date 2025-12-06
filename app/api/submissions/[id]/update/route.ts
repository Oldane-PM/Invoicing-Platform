import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { employeeCanEdit } from '@/lib/submission-status'

/**
 * PUT /api/submissions/[id]/update
 * Update a submission (Employee action)
 * - Validates that status allows editing
 * - Checks for duplicate month-year submissions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params
    const body = await request.json()
    
    const {
      employeeId,
      submissionDate,
      hoursSubmitted,
      overtimeHours,
      description,
      overtimeDescription,
    } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get existing submission
    const { data: existingSubmission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !existingSubmission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Verify employee owns this submission
    if (existingSubmission.employee_id !== employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this submission' },
        { status: 403 }
      )
    }

    // Check if status allows editing
    if (!employeeCanEdit(existingSubmission.status)) {
      return NextResponse.json(
        { error: 'This submission cannot be edited in its current status' },
        { status: 400 }
      )
    }

    // Check for duplicate month-year submission (if date changed)
    if (submissionDate !== existingSubmission.submission_date) {
      const newDate = new Date(submissionDate)
      const monthStart = format(startOfMonth(newDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(newDate), 'yyyy-MM-dd')

      const { data: duplicates, error: duplicateError } = await supabase
        .from('submissions')
        .select('id')
        .eq('employee_id', employeeId)
        .neq('id', submissionId) // Exclude current submission
        .gte('submission_date', monthStart)
        .lte('submission_date', monthEnd)

      if (!duplicateError && duplicates && duplicates.length > 0) {
        const monthYear = format(newDate, 'MMMM yyyy')
        return NextResponse.json(
          { 
            error: `You already have a submission for ${monthYear}. Please edit that submission instead of creating a new one.`,
            code: 'DUPLICATE_MONTH_YEAR'
          },
          { status: 400 }
        )
      }
    }

    // Validate required fields
    if (!submissionDate) {
      return NextResponse.json(
        { error: 'Submission date is required' },
        { status: 400 }
      )
    }

    if (!hoursSubmitted || hoursSubmitted <= 0) {
      return NextResponse.json(
        { error: 'Hours submitted must be greater than 0' },
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Work description is required' },
        { status: 400 }
      )
    }

    // Determine new status - if rejected, resubmit to SUBMITTED
    let newStatus = existingSubmission.status
    if (existingSubmission.status === 'MANAGER_REJECTED' || 
        existingSubmission.status === 'ADMIN_REJECTED' ||
        existingSubmission.status === 'rejected') {
      newStatus = 'SUBMITTED'
    }

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        submission_date: submissionDate,
        hours_submitted: hoursSubmitted,
        overtime_hours: overtimeHours || 0,
        description: description.trim(),
        overtime_description: overtimeDescription?.trim() || null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: newStatus !== existingSubmission.status 
        ? 'Submission updated and resubmitted for review'
        : 'Submission updated successfully'
    })
  } catch (error) {
    console.error('Error in submission update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

