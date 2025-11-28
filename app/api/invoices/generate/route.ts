import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf'
import type { Invoice } from '@/types/domain'

/**
 * API route to generate invoice PDF from invoice data
 * POST /api/invoices/generate
 * Body: Invoice object
 */
export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json()

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoice)

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

