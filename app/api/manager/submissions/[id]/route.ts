import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

/**
 * GET /api/manager/submissions/[id]
 * Get submission details with status log and invoices
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params

    // Get submission with employee and actor details
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        employee:employees!submissions_employee_id_fkey (
          id,
          name,
          email,
          hourly_rate
        ),
        actor:employees!submissions_acted_by_manager_id_fkey (
          id,
          name,
          role
        )
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError)
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Generate status log entries
    const statusLog: any[] = []
    const submissionDate = format(new Date(submission.submission_date), 'MMM dd, yyyy')
    const employeeName = (submission.employee as any)?.name || 'Employee'
    const actorName = (submission.actor as any)?.name || 'Manager'

    // Map status to activity details
    const statusDetails: Record<string, { title: string; description: string; performer: string }> = {
      'SUBMITTED': {
        title: 'Hours Submitted',
        description: `${employeeName} submitted ${submission.hours_submitted || 0} hours${submission.overtime_hours ? ` + ${submission.overtime_hours} overtime` : ''} for ${submissionDate}`,
        performer: employeeName,
      },
      'submitted': {
        title: 'Hours Submitted',
        description: `${employeeName} submitted ${submission.hours_submitted || 0} hours${submission.overtime_hours ? ` + ${submission.overtime_hours} overtime` : ''} for ${submissionDate}`,
        performer: employeeName,
      },
      'MANAGER_APPROVED': {
        title: 'Approved by Manager',
        description: `Submission for ${submissionDate} approved${submission.manager_comment ? `. Comment: "${submission.manager_comment}"` : ''}`,
        performer: actorName,
      },
      'approved': {
        title: 'Approved',
        description: `Submission for ${submissionDate} approved`,
        performer: actorName,
      },
      'MANAGER_REJECTED': {
        title: 'Rejected by Manager',
        description: `Submission for ${submissionDate} rejected${submission.manager_comment ? `. Reason: "${submission.manager_comment}"` : ''}`,
        performer: actorName,
      },
      'rejected': {
        title: 'Rejected',
        description: `Submission for ${submissionDate} rejected${submission.rejection_reason ? `. Reason: "${submission.rejection_reason}"` : ''}`,
        performer: actorName,
      },
      'ADMIN_PAID': {
        title: 'Payment Processed',
        description: `Payment processed for submission on ${submissionDate}${submission.admin_comment ? `. Ref: ${submission.admin_comment}` : ''}`,
        performer: 'Admin',
      },
      'payment_done': {
        title: 'Payment Processed',
        description: `Payment processed for submission on ${submissionDate}`,
        performer: 'Admin',
      },
      'ADMIN_REJECTED': {
        title: 'Rejected by Admin',
        description: `Submission for ${submissionDate} rejected by admin${submission.admin_comment ? `. Reason: "${submission.admin_comment}"` : ''}`,
        performer: 'Admin',
      },
      'NEEDS_CLARIFICATION': {
        title: 'Clarification Requested',
        description: `Admin requested clarification for submission on ${submissionDate}${submission.admin_comment ? `. Message: "${submission.admin_comment}"` : ''}`,
        performer: 'Admin',
      },
    }

    const details = statusDetails[submission.status] || {
      title: 'Status Updated',
      description: `Submission status: ${submission.status}`,
      performer: 'System',
    }

    // Add current status entry
    statusLog.push({
      id: `${submission.id}-current`,
      actionTitle: details.title,
      timestamp: format(new Date(submission.updated_at || submission.created_at), 'MM/dd/yyyy, hh:mm a'),
      description: details.description,
      performedBy: details.performer,
    })

    // Add creation entry if submission was updated after creation
    if (submission.created_at !== submission.updated_at && 
        submission.status !== 'SUBMITTED' && 
        submission.status !== 'submitted') {
      statusLog.push({
        id: `${submission.id}-created`,
        actionTitle: 'Hours Submitted',
        timestamp: format(new Date(submission.created_at), 'MM/dd/yyyy, hh:mm a'),
        description: `${employeeName} submitted ${submission.hours_submitted || 0} hours for ${submissionDate}`,
        performedBy: employeeName,
      })
    }

    // Get invoices for this submission
    let invoices: any[] = []
    if (submission.invoice_id) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', submission.invoice_id)
        .single()

      if (!invoiceError && invoice) {
        // Determine invoice status
        let invoiceStatus = 'Pending'
        if (submission.status === 'ADMIN_PAID' || submission.status === 'payment_done') {
          invoiceStatus = 'Paid'
        } else if (new Date(invoice.due_date) < new Date()) {
          invoiceStatus = 'Overdue'
        }

        invoices.push({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          issueDate: format(new Date(invoice.date), 'MMM dd, yyyy'),
          dueDate: format(new Date(invoice.due_date), 'MMM dd, yyyy'),
          amount: parseFloat(invoice.total),
          status: invoiceStatus,
        })
      }
    }

    // Also check for invoices linked by submission_id
    const { data: linkedInvoices, error: linkedError } = await supabase
      .from('invoices')
      .select('*')
      .eq('submission_id', submissionId)

    if (!linkedError && linkedInvoices && linkedInvoices.length > 0) {
      for (const inv of linkedInvoices) {
        // Skip if already added
        if (invoices.some(i => i.id === inv.id)) continue

        let invoiceStatus = 'Pending'
        if (submission.status === 'ADMIN_PAID' || submission.status === 'payment_done') {
          invoiceStatus = 'Paid'
        } else if (new Date(inv.due_date) < new Date()) {
          invoiceStatus = 'Overdue'
        }

        invoices.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          issueDate: format(new Date(inv.date), 'MMM dd, yyyy'),
          dueDate: format(new Date(inv.due_date), 'MMM dd, yyyy'),
          amount: parseFloat(inv.total),
          status: invoiceStatus,
        })
      }
    }

    return NextResponse.json({
      submission,
      statusLog,
      invoices,
    })
  } catch (error) {
    console.error('Error in submission detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

