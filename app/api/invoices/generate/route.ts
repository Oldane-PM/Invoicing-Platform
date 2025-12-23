import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf'
import type { Invoice } from '@/types/domain'

// Force Node.js runtime for PDF generation (required for pdf-lib)
export const runtime = 'nodejs'

// Disable dynamic behavior caching
export const dynamic = 'force-dynamic'

/**
 * Generate a unique request ID for logging/debugging
 */
function generateRequestId(): string {
  return `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Validate invoice data and return list of missing required fields
 */
function validateInvoiceData(invoice: any): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = []
  
  if (!invoice) {
    return { valid: false, missingFields: ['invoice (entire object is null)'] }
  }
  
  // Required fields
  if (!invoice.invoiceNumber) missingFields.push('invoiceNumber')
  if (!invoice.date) missingFields.push('date')
  if (invoice.total === undefined || invoice.total === null) missingFields.push('total')
  
  // Required nested objects
  if (!invoice.from) {
    missingFields.push('from')
  } else {
    if (!invoice.from.name) missingFields.push('from.name')
  }
  
  if (!invoice.billTo) {
    missingFields.push('billTo')
  } else {
    if (!invoice.billTo.company) missingFields.push('billTo.company')
  }
  
  return { valid: missingFields.length === 0, missingFields }
}

/**
 * Normalize invoice data with safe defaults to prevent null crashes
 */
function normalizeInvoiceData(invoice: any): Invoice {
  return {
    id: invoice.id || '',
    invoiceNumber: invoice.invoiceNumber || 'N/A',
    date: invoice.date || new Date().toISOString().split('T')[0],
    dueDate: invoice.dueDate || '',
    from: {
      name: invoice.from?.name || 'Unknown',
      address: invoice.from?.address || '—',
      state: invoice.from?.state || '',
      country: invoice.from?.country || '',
      email: invoice.from?.email || '',
    },
    billTo: {
      company: invoice.billTo?.company || 'Unknown Company',
      address: invoice.billTo?.address || '—',
    },
    items: Array.isArray(invoice.items) ? invoice.items.map((item: any) => ({
      description: item?.description || 'Service',
      hours: Number(item?.hours) || 0,
      rate: Number(item?.rate) || 0,
      amount: Number(item?.amount) || 0,
    })) : [],
    total: Number(invoice.total) || 0,
    banking: {
      bankName: invoice.banking?.bankName || '',
      bankAddress: invoice.banking?.bankAddress || '',
      swiftCode: invoice.banking?.swiftCode || '',
      abaWireRouting: invoice.banking?.abaWireRouting || '',
      accountType: invoice.banking?.accountType || '',
      currency: invoice.banking?.currency || '',
      accountNumber: invoice.banking?.accountNumber || '',
    },
    submissionId: invoice.submissionId,
  }
}

/**
 * API route to generate invoice PDF from invoice data
 * POST /api/invoices/generate
 * Body: Invoice object
 * 
 * Returns: application/pdf binary or JSON error
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  console.log(`[${requestId}] PDF generation request received`)
  
  try {
    // Step 1: Parse request body
    let rawInvoice: any
    try {
      rawInvoice = await request.json()
      console.log(`[${requestId}] Parsed invoice: invoiceNumber=${rawInvoice?.invoiceNumber}, total=${rawInvoice?.total}`)
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError)
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          requestId,
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }

    // Step 2: Validate required fields
    const validation = validateInvoiceData(rawInvoice)
    if (!validation.valid) {
      console.error(`[${requestId}] Validation failed. Missing fields:`, validation.missingFields)
      return NextResponse.json(
        { 
          error: 'Missing required invoice fields',
          missingFields: validation.missingFields,
          requestId,
          code: 'MISSING_FIELDS'
        },
        { status: 422 }
      )
    }
    
    console.log(`[${requestId}] Validation passed`)

    // Step 3: Normalize data with safe defaults
    const invoice = normalizeInvoiceData(rawInvoice)
    console.log(`[${requestId}] Invoice normalized. Items: ${invoice.items.length}, Total: $${invoice.total}`)

    // Step 4: Generate PDF
    console.log(`[${requestId}] Starting PDF generation...`)
    let pdfBuffer: Buffer
    
    try {
      pdfBuffer = await generateInvoicePdf(invoice)
      console.log(`[${requestId}] PDF generated successfully. Size: ${pdfBuffer.length} bytes`)
    } catch (pdfError) {
      console.error(`[${requestId}] PDF generation failed:`, pdfError)
      const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'
      const errorStack = pdfError instanceof Error ? pdfError.stack : ''
      
      return NextResponse.json(
        { 
          error: 'PDF generation failed',
          details: errorMessage,
          requestId,
          code: 'PDF_GENERATION_ERROR',
          stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        },
        { status: 500 }
      )
    }

    // Step 5: Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error(`[${requestId}] PDF buffer is empty`)
      return NextResponse.json(
        { 
          error: 'PDF generation produced empty result',
          requestId,
          code: 'EMPTY_PDF'
        },
        { status: 500 }
      )
    }

    // Step 6: Return PDF response
    console.log(`[${requestId}] Returning PDF response`)
    
    const response = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'X-Request-Id': requestId,
        'Cache-Control': 'no-store',
      },
    })
    
    return response
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: errorMessage,
        requestId,
        code: 'UNEXPECTED_ERROR',
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
