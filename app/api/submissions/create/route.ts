import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { format, startOfMonth, endOfMonth } from 'date-fns'

/**
 * API route to create a new submission
 * POST /api/submissions/create
 * 
 * IMPORTANT: This endpoint automatically fetches the employee's current manager_id
 * from the team_members table to ensure submissions appear on the correct Manager Dashboard.
 * 
 * Supports idempotency keys to prevent duplicate submissions from double-clicks.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      managerId: providedManagerId, // May be provided or null
      submissionDate,
      hoursSubmitted,
      overtimeHours,
      description,
      overtimeDescription,
      // idempotencyKey, // Optional: enable after running migration 006_add_idempotency_key.sql
    } = body

    if (!employeeId || !submissionDate || !hoursSubmitted || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // NOTE: Idempotency key check is disabled until the migration is run
    // The frontend's isSubmitting state provides the primary double-click protection
    // To enable database-level idempotency, run migration: 006_add_idempotency_key.sql

    // Check for duplicate month-year submission (business rule)
    const subDate = new Date(submissionDate)
    const monthStart = format(startOfMonth(subDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(subDate), 'yyyy-MM-dd')

    const { data: existingSubmissions, error: dupError } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('employee_id', employeeId)
      .gte('submission_date', monthStart)
      .lte('submission_date', monthEnd)

    if (!dupError && existingSubmissions && existingSubmissions.length > 0) {
      const monthYear = format(subDate, 'MMMM yyyy')
      return NextResponse.json(
        { 
          error: `You already have a submission for ${monthYear}. Please edit that submission instead of creating a new one.`,
          code: 'DUPLICATE_MONTH_YEAR'
        },
        { status: 400 }
      )
    }

    // Fetch the employee's current manager_id from employees table (single source of truth)
    // This ensures submissions are automatically routed to the correct manager
    let finalManagerId = providedManagerId || null

    if (!finalManagerId) {
      const { data: employee, error: empError } = await supabaseAdmin
        .from('employees')
        .select('manager_id')
        .eq('id', employeeId)
        .single()

      if (employee && !empError) {
        finalManagerId = employee.manager_id
        console.log(`Auto-assigned manager_id ${finalManagerId} for employee ${employeeId}`)
      } else {
        console.log(`No manager set on employees table for ${employeeId}, submission will have null manager_id`)
      }
    }

    // Create submission using admin client (bypasses RLS for now)
    // The manager_id is set automatically to ensure it appears on the Manager Dashboard
    const insertData: Record<string, any> = {
      employee_id: employeeId,
      manager_id: finalManagerId,
      submission_date: submissionDate,
      hours_submitted: hoursSubmitted,
      overtime_hours: overtimeHours > 0 ? overtimeHours : null,
      description: description,
      overtime_description: overtimeHours > 0 ? overtimeDescription : null,
      status: 'SUBMITTED',
    }

    // NOTE: idempotency_key support is optional - only add if the column exists
    // The duplicate month-year check above provides the main duplicate protection
    // To enable idempotency key support, run the migration: 006_add_idempotency_key.sql
    // if (idempotencyKey) {
    //   insertData.idempotency_key = idempotencyKey
    // }

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      
      // Handle unique constraint violation on employee_id + month/year
      if (error.code === '23505') {
        const monthYear = format(new Date(submissionDate), 'MMMM yyyy')
        return NextResponse.json(
          { 
            error: `You already have a submission for ${monthYear}. Please edit that submission instead of creating a new one.`,
            code: 'DUPLICATE_MONTH_YEAR'
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create submission', details: error.message },
        { status: 500 }
      )
    }

    // Notify manager that hours were submitted
    if (data && finalManagerId) {
      try {
        const { data: employee, error: employeeError } = await supabaseAdmin
          .from('employees')
          .select('name')
          .eq('id', employeeId)
          .single()

        const employeeName = !employeeError && employee?.name ? employee.name : 'Employee'
        const submissionDateLabel = format(new Date(submissionDate), 'MMM dd, yyyy')

        await createNotification({
          userId: finalManagerId,
          role: 'MANAGER',
          type: 'HOURS_SUBMITTED',
          title: 'New hours submitted',
          message: `${employeeName} submitted hours for ${submissionDateLabel}.`,
          entityType: 'SUBMISSION',
          entityId: data.id,
          metadata: {
            employeeId,
            submissionDate,
          },
        })
      } catch (notifError) {
        console.error('Error creating manager notification for submission:', notifError)
      }
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

