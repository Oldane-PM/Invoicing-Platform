import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'
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

    // Server-side validation: Check for blocked dates (Admin holidays)
    const blockedDatesCheck = await checkForBlockedDates(employeeId, submissionDate)
    if (blockedDatesCheck.hasBlockedDates) {
      return NextResponse.json(
        { 
          error: 'SUBMISSION_CONTAINS_BLOCKED_DATES',
          message: 'Submission contains dates blocked by Admin',
          blockedDates: blockedDatesCheck.blockedDates,
        },
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

/**
 * Normalize a date to YYYY-MM-DD format (date-only, no timezone issues)
 */
function normalizeDateToYYYYMMDD(dateInput: string | Date): string {
  if (!dateInput) return ''
  
  const dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString()
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Extract YYYY-MM-DD from ISO string or other formats
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) {
    return match[1]
  }
  
  return ''
}

/**
 * Check if submission date overlaps with admin-blocked holidays
 * 
 * IMPORTANT: Uses YYYY-MM-DD string comparisons to avoid timezone issues.
 */
async function checkForBlockedDates(
  employeeId: string,
  submissionDate: string
): Promise<{ hasBlockedDates: boolean; blockedDates: string[] }> {
  try {
    // Fetch employee info for scoping
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('contract_type, country, region')
      .eq('id', employeeId)
      .single()

    // Fetch all holidays (not just active - we filter in code)
    const { data: holidays, error } = await supabaseAdmin
      .from('holidays')
      .select('*')

    if (error || !holidays) {
      // If we can't fetch holidays, allow submission (fail open)
      return { hasBlockedDates: false, blockedDates: [] }
    }

    const blockedDates: string[] = []
    const subDateStr = normalizeDateToYYYYMMDD(submissionDate)

    // Check each holiday
    for (const holiday of holidays) {
      // Skip inactive holidays
      if (holiday.is_active === false) {
        continue
      }

      // Parse holiday dates
      let holidayDates: string[] = []
      if (typeof holiday.dates === 'string') {
        try {
          holidayDates = JSON.parse(holiday.dates)
        } catch {
          continue
        }
      } else if (Array.isArray(holiday.dates)) {
        holidayDates = holiday.dates
      }

      // Check if submission date matches any holiday date
      for (const dateStr of holidayDates) {
        const holidayDate = normalizeDateToYYYYMMDD(dateStr)
        
        if (holidayDate === subDateStr) {
          // Check if holiday applies to this employee
          if (doesHolidayApplyToEmployee(holiday, employee)) {
            if (!blockedDates.includes(holidayDate)) {
              blockedDates.push(holidayDate)
            }
          }
        }
      }
    }

    return {
      hasBlockedDates: blockedDates.length > 0,
      blockedDates,
    }
  } catch (error) {
    console.error('Error checking blocked dates:', error)
    return { hasBlockedDates: false, blockedDates: [] }
  }
}

/**
 * Check if a holiday applies to an employee
 */
function doesHolidayApplyToEmployee(holiday: any, employee: any): boolean {
  if (!employee) return true

  // Check employee type scope
  if (!holiday.applies_to_all_employee_types && holiday.applies_to_all_employee_types !== null) {
    const employeeTypes = parseJsonArray(holiday.employee_types).map((t: string) => t.toLowerCase())
    if (employeeTypes.length > 0 && employee.contract_type) {
      const empType = employee.contract_type.toLowerCase()
      if (!employeeTypes.some((t: string) => empType.includes(t) || t.includes(empType))) {
        return false
      }
    }
  }

  // Check location scope
  if (!holiday.applies_to_all_locations && holiday.applies_to_all_locations !== null) {
    const countries = parseJsonArray(holiday.countries).map((c: string) => c.toLowerCase())
    if (countries.length > 0 && employee.country) {
      if (!countries.includes(employee.country.toLowerCase())) {
        return false
      }
    }
  }

  return true
}

function parseJsonArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

