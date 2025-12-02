import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { Invoice } from '@/types/domain'

/**
 * API route to create/save an invoice to Supabase
 * POST /api/invoices/create
 */
export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json()

    if (!invoice || !invoice.invoiceNumber) {
      return NextResponse.json(
        { error: 'Invalid invoice data' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Save invoice to Supabase
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        id: invoice.id,
        submission_id: invoice.submissionId || null,
        invoice_number: invoice.invoiceNumber,
        date: invoice.date,
        due_date: invoice.dueDate,
        from_name: invoice.from.name,
        from_address: invoice.from.address,
        from_state: invoice.from.state,
        from_country: invoice.from.country,
        from_email: invoice.from.email,
        bill_to_company: invoice.billTo.company,
        bill_to_address: invoice.billTo.address,
        total: invoice.total,
        bank_name: invoice.banking?.bankName || null,
        bank_address: invoice.banking?.bankAddress || null,
        swift_code: invoice.banking?.swiftCode || null,
        aba_wire_routing: invoice.banking?.abaWireRouting || null,
        account_type: invoice.banking?.accountType || null,
        currency: invoice.banking?.currency || null,
        account_number: invoice.banking?.accountNumber || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json(
        { error: 'Failed to create invoice', details: error.message },
        { status: 500 }
      )
    }

    // Update submission with invoice_id if submissionId is provided
    if (invoice.submissionId) {
      const { error: updateError } = await supabaseAdmin
        .from('submissions')
        .update({ invoice_id: invoice.id })
        .eq('id', invoice.submissionId)

      if (updateError) {
        console.error('Error updating submission with invoice_id:', updateError)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in create invoice route:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

