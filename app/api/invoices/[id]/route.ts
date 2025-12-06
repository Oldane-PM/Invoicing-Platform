import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { Invoice } from '@/types/domain'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Fetch invoice using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('Error fetching invoice:', error)
      return NextResponse.json(
        { error: 'Invoice not found', details: error.message },
        { status: 404 }
      )
    }

    // Transform database invoice to frontend Invoice format
    const invoice: Invoice = {
      id: data.id,
      invoiceNumber: data.invoice_number,
      date: data.date,
      dueDate: data.due_date,
      from: {
        name: data.from_name,
        address: data.from_address || '',
        state: data.from_state || '',
        country: data.from_country || '',
        email: data.from_email || '',
      },
      billTo: {
        company: data.bill_to_company,
        address: data.bill_to_address,
      },
      items: [],
      total: parseFloat(data.total.toString()),
      banking: {
        bankName: data.bank_name || '',
        bankAddress: data.bank_address || '',
        swiftCode: data.swift_code || '',
        abaWireRouting: data.aba_wire_routing || '',
        accountType: data.account_type || '',
        currency: data.currency || '',
        accountNumber: data.account_number || '',
      },
      submissionId: data.submission_id || undefined,
    }

    // If invoice has a submission_id, fetch submission to get items
    if (invoice.submissionId) {
      const { data: submission, error: subError } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', invoice.submissionId)
        .single()

      if (!subError && submission) {
        // Reconstruct items from submission
        const hourlyRate = parseFloat(invoice.total.toString()) / (submission.hours_submitted + (submission.overtime_hours || 0))
        
        invoice.items = [
          {
            description: submission.description,
            hours: submission.hours_submitted,
            rate: hourlyRate,
            amount: submission.hours_submitted * hourlyRate,
          },
        ]

        if (submission.overtime_hours && submission.overtime_hours > 0) {
          invoice.items.push({
            description: submission.overtime_description || 'Overtime hours',
            hours: submission.overtime_hours,
            rate: hourlyRate,
            amount: submission.overtime_hours * hourlyRate,
          })
        }
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

