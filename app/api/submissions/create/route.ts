import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createNotification } from '@/lib/supabase/queries/notifications'
import { format } from 'date-fns'

/**
 * API route to create a new submission
 * POST /api/submissions/create
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      managerId,
      submissionDate,
      hoursSubmitted,
      overtimeHours,
      description,
      overtimeDescription,
    } = body

    if (!employeeId || !submissionDate || !hoursSubmitted || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create submission using admin client (bypasses RLS for now)
    // TODO: Replace with proper auth session
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert({
        employee_id: employeeId,
        manager_id: managerId || null,
        submission_date: submissionDate,
        hours_submitted: hoursSubmitted,
        overtime_hours: overtimeHours > 0 ? overtimeHours : null,
        description: description,
        overtime_description: overtimeHours > 0 ? overtimeDescription : null,
        status: 'submitted',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json(
        { error: 'Failed to create submission', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in create submission route:', error)
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    )
  }
}

