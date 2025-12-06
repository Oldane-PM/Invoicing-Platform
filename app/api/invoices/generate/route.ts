import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf'
import type { Invoice } from '@/types/domain'

// Force Node.js runtime for PDFKit (requires Node.js APIs)
export const runtime = 'nodejs'

/**
 * API route to generate invoice PDF from invoice data
 * POST /api/invoices/generate
 * Body: Invoice object
 */
export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json()

    // Validate invoice data
    if (!invoice || !invoice.invoiceNumber) {
      return NextResponse.json(
        { error: 'Invalid invoice data' },
        { status: 400 }
      )
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    )
  }
}

