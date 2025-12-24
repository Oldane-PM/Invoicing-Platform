import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// Force dynamic to prevent static generation error
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Fetch submission with employee details
    const { data: submission, error } = await supabase
      .from('submissions')
      .select(`
        id,
        employee_id,
        date,
        hours_submitted,
        overtime_hours,
        description,
        overtime_description,
        status,
        created_at,
        updated_at,
        submission_date,
        employees!inner(
          name,
          email,
          hourly_rate
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch submission' },
        { status: 500 }
      )
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Transform the data to match the frontend interface
    // Handle both array and single object cases for employees join
    const employee = Array.isArray(submission.employees) 
      ? submission.employees[0] 
      : submission.employees
    
    const transformedSubmission = {
      id: submission.id,
      employee_id: submission.employee_id,
      employee_name: employee?.name || 'Unknown',
      employee_email: employee?.email || '',
      date: submission.date,
      hours_submitted: submission.hours_submitted,
      overtime_hours: submission.overtime_hours,
      description: submission.description,
      overtime_description: submission.overtime_description,
      status: submission.status,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      submission_date: submission.submission_date,
      hourly_rate: employee?.hourly_rate || 0,
    }

    return NextResponse.json({
      submission: transformedSubmission
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

