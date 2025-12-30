import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id
    
    // 🔍 Log incoming request
    console.log('[API] GET /api/admin/employees/:id', { employeeId })
    
    // ✅ Guard: Validate employeeId
    if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
      console.error('❌ [API] Invalid employeeId:', { employeeId })
      return NextResponse.json(
        { 
          error: 'Invalid employee ID',
          hint: 'Employee ID is required and must be a valid UUID'
        },
        { status: 400 }
      )
    }

    // Get employee details with reporting manager join
    // ✅ Using .maybeSingle() to handle missing records gracefully
    // Note: For self-referencing FK, we need to specify the full constraint name
    // If this fails, run VERIFY_FK_CONSTRAINT.sql to get the exact name
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        reporting_manager:employees!reporting_manager_id (
          id,
          name,
          email
        )
      `)
      .eq('id', employeeId)
      .maybeSingle()

    if (employeeError) {
      // 🚨 DETAILED ERROR LOGGING
      console.error('❌ [API] Supabase error fetching employee:', {
        employeeId,
        code: employeeError.code,
        message: employeeError.message,
        details: employeeError.details,
        hint: employeeError.hint
      })
      return NextResponse.json(
        { 
          error: 'Database error fetching employee',
          code: employeeError.code,
          message: employeeError.message,
          details: employeeError.details,
          hint: employeeError.hint
        },
        { status: 500 }
      )
    }
    
    // ✅ Handle missing employee gracefully
    if (!employee) {
      console.warn('⚠️ [API] Employee not found:', { employeeId })
      return NextResponse.json(
        { 
          error: 'Employee not found',
          employeeId,
          hint: 'The employee ID does not exist in the database'
        },
        { status: 404 }
      )
    }
    
    console.log('[API] Employee found:', { id: employee.id, name: employee.name })

    // Get employee submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('submission_date', { ascending: false })
      .limit(10)

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError)
    }

    // Format submissions for the drawer
    const formattedSubmissions = (submissions || []).map(s => {
      const totalHours = (s.hours_submitted || 0) + (s.overtime_hours || 0)
      const hourlyRate = employee.hourly_rate || 0
      const totalAmount = totalHours * hourlyRate

      // Map status to display format
      const statusMap: Record<string, string> = {
        submitted: 'Submitted',
        approved: 'Approved',
        rejected: 'Rejected',
        payment_done: 'Paid',
      }

      return {
        id: s.id,
        date: new Date(s.submission_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        projectName: employee.active_project || 'General Work',
        status: statusMap[s.status] || s.status,
        regularHours: s.hours_submitted || 0,
        overtimeHours: s.overtime_hours || 0,
        totalAmount,
      }
    })

    // Get invoices for this employee's submissions
    const submissionIds = (submissions || []).map(s => s.id)
    let formattedInvoices: any[] = []

    if (submissionIds.length > 0) {
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .in('submission_id', submissionIds)
        .order('created_at', { ascending: false })

      if (!invoicesError && invoices) {
        formattedInvoices = invoices.map(inv => {
          // Determine invoice status based on submission status
          const relatedSubmission = (submissions || []).find(s => s.id === inv.submission_id)
          let invoiceStatus = 'Pending'
          if (relatedSubmission?.status === 'payment_done') {
            invoiceStatus = 'Paid'
          } else if (new Date(inv.due_date) < new Date()) {
            invoiceStatus = 'Overdue'
          }

          return {
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            issueDate: inv.date,
            dueDate: inv.due_date,
            amount: parseFloat(inv.total),
            status: invoiceStatus,
          }
        })
      }
    }

    // Get team membership for contract info
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select(`
        *,
        manager:employees!team_members_manager_id_fkey (
          name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Build contract info with rate type support
    const contractInfo = {
      startDate: teamMember?.contract_start
        ? new Date(teamMember.contract_start).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : employee.created_at
        ? new Date(employee.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'N/A',
      endDate: teamMember?.contract_end
        ? new Date(teamMember.contract_end).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : undefined,
      rateType: employee.rate_type || 'hourly',
      hourlyRate: employee.hourly_rate || 0,
      overtimeRate: employee.overtime_rate || (employee.hourly_rate || 0) * 1.5,
      fixedIncome: employee.monthly_rate || undefined,
      positionTitle: teamMember?.project_name || 'Team Member',
      department: 'General',
      reportingManager: (teamMember?.manager as any)?.name || 'Unassigned',
      reportingManagerId: teamMember?.manager_id || undefined, // Include manager ID for form binding
    }

    // Get notifications as status log
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Format status log entries
    const statusLog = (notifications || []).map(n => ({
      id: n.id,
      actionTitle: n.title,
      timestamp: new Date(n.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      description: n.message,
      performedBy: 'System',
    }))

    // If no notifications, create log from submissions
    if (statusLog.length === 0 && (submissions || []).length > 0) {
      const submissionLogs = (submissions || []).map(s => {
        let actionTitle = 'Submission Created'
        if (s.status === 'approved') actionTitle = 'Submission Approved'
        else if (s.status === 'rejected') actionTitle = 'Submission Rejected'
        else if (s.status === 'payment_done') actionTitle = 'Payment Processed'

        return {
          id: s.id,
          actionTitle,
          timestamp: new Date(s.updated_at || s.created_at).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          description: s.description || 'Time submission',
          performedBy: s.acted_by_manager_id ? 'Manager' : employee.name,
        }
      })
      statusLog.push(...submissionLogs)
    }

    return NextResponse.json({
      employee,
      submissions: formattedSubmissions,
      invoices: formattedInvoices,
      contractInfo,
      statusLog,
    })
  } catch (error) {
    console.error('Error in employee detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/employees/[id]
 * Update employee fields (manager, rate type, rates, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()

    // Allowed fields on the employees table
    const employeeFields = ['hourly_rate', 'overtime_rate', 'monthly_rate', 'rate_type', 'status', 'active_project', 'manager_id']

    // Filter to only allowed employee fields
    const employeeUpdateData: Record<string, any> = {}
    for (const field of employeeFields) {
      if (body[field] !== undefined) {
        employeeUpdateData[field] = body[field]
      }
    }

    let managerChanged = false
    let newManagerId: string | null = null
    let newManagerName: string | null = null

    // Handle manager update via team_members table
    if (body.reporting_manager_id !== undefined) {
      newManagerId = body.reporting_manager_id || null

      // Also stage update for employees.manager_id so it's the single source of truth
      employeeUpdateData.manager_id = newManagerId

      // Get the new manager's name for notification
      if (newManagerId) {
        const { data: managerData } = await supabaseAdmin
          .from('employees')
          .select('name')
          .eq('id', newManagerId)
          .single()
        newManagerName = managerData?.name || 'Manager'
      }

      // Check if there's an existing team member entry for this employee
      const { data: existingTeamMember } = await supabaseAdmin
        .from('team_members')
        .select('id, manager_id')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingTeamMember) {
        // Check if manager actually changed
        if (existingTeamMember.manager_id !== newManagerId) {
          managerChanged = true
          
          if (newManagerId) {
            // Update existing team member's manager
            const { error: updateError } = await supabaseAdmin
              .from('team_members')
              .update({ 
                manager_id: newManagerId,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTeamMember.id)

            if (updateError) {
              console.error('Error updating team member:', updateError)
              return NextResponse.json(
                { error: 'Failed to update manager assignment' },
                { status: 500 }
              )
            }
          } else {
            // Remove from team (manager set to null/empty)
            const { error: deleteError } = await supabaseAdmin
              .from('team_members')
              .delete()
              .eq('id', existingTeamMember.id)

            if (deleteError) {
              console.error('Error removing team member:', deleteError)
              return NextResponse.json(
                { error: 'Failed to remove manager assignment' },
                { status: 500 }
              )
            }
          }
        }
      } else if (newManagerId) {
        // Create new team member entry
        managerChanged = true
        const contractStart = new Date().toISOString().split('T')[0]
        const contractEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { error: insertError } = await supabaseAdmin
          .from('team_members')
          .insert({
            employee_id: employeeId,
            manager_id: newManagerId,
            contract_start: contractStart,
            contract_end: contractEnd,
          })

        if (insertError) {
          console.error('Error creating team member:', insertError)
          return NextResponse.json(
            { error: 'Failed to create manager assignment' },
            { status: 500 }
          )
        }
      }

      // CRITICAL: Sync all submissions for this employee to the new manager
      // This ensures both past and future submissions appear on the correct Manager Dashboard
      if (managerChanged) {
        const { error: submissionsUpdateError } = await supabaseAdmin
          .from('submissions')
          .update({ 
            manager_id: newManagerId,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)

        if (submissionsUpdateError) {
          console.error('Error updating submissions manager_id:', submissionsUpdateError)
          // Log but don't fail - the team_members update is the primary operation
        } else {
          console.log(`Synced all submissions for employee ${employeeId} to manager ${newManagerId}`)
        }
      }

      // Create notification for employee if manager was assigned
      if (managerChanged && newManagerId) {
        try {
          await supabaseAdmin
            .from('notifications')
            .insert({
              employee_id: employeeId,
              type: 'team_added',
              title: 'Manager Assigned',
              message: `You have been assigned to ${newManagerName}'s team.`,
              is_read: false,
            })
        } catch (notifError) {
          console.error('Error creating notification:', notifError)
          // Don't fail the request if notification fails
        }
      }

      // Create notification if removed from team
      if (managerChanged && !newManagerId) {
        try {
          await supabaseAdmin
            .from('notifications')
            .insert({
              employee_id: employeeId,
              type: 'team_removed',
              title: 'Manager Removed',
              message: 'You have been removed from your team assignment.',
              is_read: false,
            })
        } catch (notifError) {
          console.error('Error creating notification:', notifError)
        }
      }
    }

    // Update employee record if there are employee fields to update
    if (Object.keys(employeeUpdateData).length > 0) {
      const { data: updatedEmployee, error } = await supabaseAdmin
        .from('employees')
        .update(employeeUpdateData)
        .eq('id', employeeId)
        .select()
        .single()

      if (error) {
        console.error('Error updating employee:', error)
        return NextResponse.json(
          { error: 'Failed to update employee' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        employee: updatedEmployee,
        managerUpdated: managerChanged,
        newManagerName 
      })
    }

    // If only manager was updated, return success with details
    return NextResponse.json({ 
      success: true,
      managerUpdated: managerChanged,
      newManagerName
    })
  } catch (error) {
    console.error('Error in employee update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

