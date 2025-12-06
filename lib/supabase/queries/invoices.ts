import { supabase } from '../client'
import type { Invoice } from '@/types/domain'

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    throw error
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
    items: [], // Items are stored separately or need to be reconstructed from submission
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

  return invoice
}

/**
 * Get invoice items from submission (reconstruct from submission data)
 * This is a helper to get invoice items when viewing an invoice
 */
export async function getInvoiceWithItems(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId)
  
  // If invoice has a submission_id, fetch submission to get items
  if (invoice.submissionId) {
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', invoice.submissionId)
      .single()

    if (!error && submission) {
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

  return invoice
}

