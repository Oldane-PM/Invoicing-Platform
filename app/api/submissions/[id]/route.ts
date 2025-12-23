import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const transformedSubmission = {
      id: submission.id,
      employee_id: submission.employee_id,
      employee_name: submission.employees.name,
      employee_email: submission.employees.email,
      date: submission.date,
      hours_submitted: submission.hours_submitted,
      overtime_hours: submission.overtime_hours,
      description: submission.description,
      overtime_description: submission.overtime_description,
      status: submission.status,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      submission_date: submission.submission_date,
      hourly_rate: submission.employees.hourly_rate,
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

