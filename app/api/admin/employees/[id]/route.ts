import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (employeeError) {
      console.error('Error fetching employee:', employeeError)
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

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

    // Build contract info
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
      hourlyRate: employee.hourly_rate || 0,
      overtimeRate: (employee.hourly_rate || 0) * 1.5,
      positionTitle: teamMember?.project_name || 'Team Member',
      department: 'General',
      reportingManager: (teamMember?.manager as any)?.name || 'Unassigned',
      reportingManagerId: teamMember?.manager_id || undefined, // Include manager ID for form binding
    }

    // Build comprehensive status log from submissions with actor details
    const statusLog: any[] = []

    // Get submissions with manager details for status log
    const { data: submissionsWithActors, error: actorsError } = await supabase
      .from('submissions')
      .select(`
        *,
        actor:employees!submissions_acted_by_manager_id_fkey (
          id,
          name,
          role
        )
      `)
      .eq('employee_id', employeeId)
      .order('updated_at', { ascending: false })
      .limit(20)

    // Generate activity log entries from submissions
    if (submissionsWithActors && submissionsWithActors.length > 0) {
      for (const s of submissionsWithActors) {
        const submissionDate = new Date(s.submission_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        // Map status to activity details
        const statusDetails: Record<string, { title: string; description: string; performer: string }> = {
          'SUBMITTED': {
            title: 'Hours Submitted',
            description: `Submitted ${s.hours_submitted || 0} hours${s.overtime_hours ? ` + ${s.overtime_hours} overtime` : ''} for ${submissionDate}`,
            performer: employee.name,
          },
          'submitted': {
            title: 'Hours Submitted',
            description: `Submitted ${s.hours_submitted || 0} hours${s.overtime_hours ? ` + ${s.overtime_hours} overtime` : ''} for ${submissionDate}`,
            performer: employee.name,
          },
          'MANAGER_APPROVED': {
            title: 'Submission Approved by Manager',
            description: `Hours for ${submissionDate} approved${s.manager_comment ? `. Comment: "${s.manager_comment}"` : ''}`,
            performer: (s.actor as any)?.name || 'Manager',
          },
          'approved': {
            title: 'Submission Approved',
            description: `Hours for ${submissionDate} approved`,
            performer: (s.actor as any)?.name || 'Manager',
          },
          'MANAGER_REJECTED': {
            title: 'Submission Rejected by Manager',
            description: `Hours for ${submissionDate} rejected${s.manager_comment ? `. Reason: "${s.manager_comment}"` : ''}`,
            performer: (s.actor as any)?.name || 'Manager',
          },
          'rejected': {
            title: 'Submission Rejected',
            description: `Hours for ${submissionDate} rejected${s.rejection_reason ? `. Reason: "${s.rejection_reason}"` : ''}`,
            performer: (s.actor as any)?.name || 'Manager',
          },
          'ADMIN_PAID': {
            title: 'Payment Processed',
            description: `Payment processed for hours submitted on ${submissionDate}${s.admin_comment ? `. Ref: ${s.admin_comment}` : ''}`,
            performer: (s.actor as any)?.name || 'Admin',
          },
          'payment_done': {
            title: 'Payment Processed',
            description: `Payment processed for hours submitted on ${submissionDate}`,
            performer: 'Admin',
          },
          'ADMIN_REJECTED': {
            title: 'Submission Rejected by Admin',
            description: `Hours for ${submissionDate} rejected by admin${s.admin_comment ? `. Reason: "${s.admin_comment}"` : ''}`,
            performer: (s.actor as any)?.name || 'Admin',
          },
          'NEEDS_CLARIFICATION': {
            title: 'Clarification Requested',
            description: `Admin requested clarification for submission on ${submissionDate}${s.admin_comment ? `. Message: "${s.admin_comment}"` : ''}`,
            performer: (s.actor as any)?.name || 'Admin',
          },
        }

        const details = statusDetails[s.status] || {
          title: 'Status Updated',
          description: `Submission for ${submissionDate} - Status: ${s.status}`,
          performer: 'System',
        }

        statusLog.push({
          id: `${s.id}-${s.status}`,
          actionTitle: details.title,
          timestamp: new Date(s.updated_at || s.created_at).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          description: details.description,
          performedBy: details.performer,
        })

        // If the submission was created at a different time than updated, add creation entry
        if (s.created_at && s.updated_at && s.created_at !== s.updated_at && s.status !== 'SUBMITTED' && s.status !== 'submitted') {
          statusLog.push({
            id: `${s.id}-created`,
            actionTitle: 'Hours Submitted',
            timestamp: new Date(s.created_at).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            description: `Submitted ${s.hours_submitted || 0} hours${s.overtime_hours ? ` + ${s.overtime_hours} overtime` : ''} for ${submissionDate}`,
            performedBy: employee.name,
          })
        }
      }
    }

    // Also get notifications for additional context
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Add notifications to status log
    if (notifications && notifications.length > 0) {
      for (const n of notifications) {
        // Avoid duplicates by checking if similar entry exists
        const existingEntry = statusLog.find(
          log => log.actionTitle === n.title && 
                 Math.abs(new Date(log.timestamp).getTime() - new Date(n.created_at).getTime()) < 60000
        )
        
        if (!existingEntry) {
          statusLog.push({
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
          })
        }
      }
    }

    // Sort by timestamp descending
    statusLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()

    // Allowed fields on the employees table
    const employeeFields = ['hourly_rate', 'status', 'active_project', 'manager_id']

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

