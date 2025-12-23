import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib'
import type { Invoice } from '@/types/domain'

/**
 * Safe string helper - ensures we never pass undefined/null to drawText
 */
function safeStr(value: any, fallback: string = '—'): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

/**
 * Safe number formatter
 */
function formatCurrency(value: any): string {
  const num = Number(value) || 0
  return `$${num.toFixed(2)}`
}

/**
 * Generates an invoice PDF using pdf-lib
 * Returns a Buffer that can be used to create a Blob or sent as a response
 * 
 * @throws Error if PDF generation fails
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  // Validate invoice object
  if (!invoice) {
    throw new Error('Invoice object is required')
  }

  console.log('[PDF] Creating new PDF document...')
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  
  // Embed standard fonts (these are built into PDF viewers, no external files needed)
  console.log('[PDF] Embedding fonts...')
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Add a page (Letter size: 612 x 792 points)
  console.log('[PDF] Adding page...')
  const page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()
  
  const margin = 50
  let yPosition = height - margin
  
  // Helper to draw text safely
  const drawText = (text: string, x: number, y: number, options: { font?: typeof helvetica, size?: number, color?: RGB } = {}) => {
    const safeText = safeStr(text, '')
    if (!safeText) return // Skip empty strings
    
    try {
      page.drawText(safeText, {
        x,
        y,
        font: options.font || helvetica,
        size: options.size || 10,
        color: options.color || rgb(0, 0, 0),
      })
    } catch (err) {
      console.warn('[PDF] Error drawing text:', err)
    }
  }
  
  // Helper to draw a line
  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    try {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5),
      })
    } catch (err) {
      console.warn('[PDF] Error drawing line:', err)
    }
  }

  console.log('[PDF] Drawing content...')

  // Title
  drawText('Invoice', margin, yPosition, { font: helveticaBold, size: 24 })

  // Invoice details (top right)
  const invoiceDetailsX = width - margin - 180
  drawText('Invoice No.', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(safeStr(invoice.invoiceNumber), invoiceDetailsX + 70, yPosition)

  yPosition -= 14
  drawText('Date:', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(safeStr(invoice.date), invoiceDetailsX + 70, yPosition)

  yPosition -= 14
  drawText('Invoice Due:', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(safeStr(invoice.dueDate), invoiceDetailsX + 70, yPosition)

  yPosition = height - margin - 60

  // FROM section
  drawText('FROM:', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  drawText(safeStr(invoice.from?.name), margin, yPosition)
  yPosition -= 14
  drawText(safeStr(invoice.from?.address), margin, yPosition)
  yPosition -= 14
  
  const stateCountry = [invoice.from?.state, invoice.from?.country].filter(Boolean).join(', ')
  drawText(safeStr(stateCountry, ''), margin, yPosition)
  yPosition -= 14
  drawText(safeStr(invoice.from?.email), margin, yPosition)

  yPosition -= 24

  // BILL TO section
  drawText('BILL TO:', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  drawText(safeStr(invoice.billTo?.company), margin, yPosition)
  yPosition -= 14
  drawText(safeStr(invoice.billTo?.address), margin, yPosition)

  yPosition -= 24

  // Divider line
  drawLine(margin, yPosition, width - margin, yPosition)
  yPosition -= 18

  // Items table header
  drawText('Description', margin, yPosition, { font: helveticaBold })
  drawText('Hours', width - margin - 180, yPosition, { font: helveticaBold })
  drawText('Rate', width - margin - 110, yPosition, { font: helveticaBold })
  drawText('Amount', width - margin - 40, yPosition, { font: helveticaBold })

  yPosition -= 12
  drawLine(margin, yPosition, width - margin, yPosition)
  yPosition -= 18

  // Items
  const items = invoice.items || []
  if (items.length === 0) {
    // Show placeholder if no items
    drawText('No line items', margin, yPosition)
    yPosition -= 18
  } else {
    for (const item of items) {
      // Truncate description if too long
      const description = safeStr(item?.description, 'Service').substring(0, 50)
      
      drawText(description, margin, yPosition)
      drawText(String(item?.hours || 0), width - margin - 180, yPosition)
      drawText(formatCurrency(item?.rate), width - margin - 110, yPosition)
      drawText(formatCurrency(item?.amount), width - margin - 40, yPosition)

      yPosition -= 18
    }
  }

  // Divider line before total
  yPosition -= 6
  drawLine(margin, yPosition, width - margin, yPosition)
  yPosition -= 18

  // Total
  const totalX = width - margin - 180
  drawText('Total', totalX, yPosition, { font: helveticaBold, size: 12 })
  drawText(formatCurrency(invoice.total), width - margin - 40, yPosition, { font: helveticaBold, size: 12 })

  yPosition -= 12
  drawLine(totalX, yPosition, width - margin, yPosition)

  yPosition -= 36

  // Banking Information (only show if banking info exists)
  if (invoice.banking) {
    drawText('Payable TO:', margin, yPosition, { font: helveticaBold })
    yPosition -= 14
    drawText('Bank Information', margin, yPosition, { font: helveticaBold })
    yPosition -= 14
    
    drawText(`Account Holder Name: ${safeStr(invoice.from?.name)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Bank Name: ${safeStr(invoice.banking.bankName)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Bank Address: ${safeStr(invoice.banking.bankAddress)}`, margin, yPosition)
    yPosition -= 14
    drawText(`SWIFT Code: ${safeStr(invoice.banking.swiftCode)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Bank Transit: ${safeStr(invoice.banking.abaWireRouting)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Account Type: ${safeStr(invoice.banking.accountType)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Account Number: ${safeStr(invoice.banking.accountNumber)}`, margin, yPosition)
    yPosition -= 14
    drawText(`Account Currency: ${safeStr(invoice.banking.currency)}`, margin, yPosition)
  }

  // Serialize the PDF to bytes
  // CRITICAL: These options fix the "invalid distance too far back" compression error
  console.log('[PDF] Saving PDF document...')
  
  try {
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,     // Disable object streams (fixes zlib issues)
      addDefaultPage: false,        // Don't add extra blank page
      updateFieldAppearances: false, // Skip form field processing
    })
    
    console.log(`[PDF] PDF saved successfully. Size: ${pdfBytes.length} bytes`)
    
    // Convert Uint8Array to Buffer
    return Buffer.from(pdfBytes)
  } catch (saveError) {
    console.error('[PDF] Error saving PDF:', saveError)
    throw new Error(`Failed to save PDF: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`)
  }
}
