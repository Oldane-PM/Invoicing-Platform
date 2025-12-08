import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib'
import type { Invoice } from '@/types/domain'

/**
 * Generates an invoice PDF using pdf-lib
 * Returns a Buffer that can be used to create a Blob or sent as a response
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  
  // Embed standard fonts (these are built into PDF viewers, no external files needed)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Add a page (Letter size: 612 x 792 points)
  const page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()
  
      const margin = 50
  let yPosition = height - margin
  
  // Helper to draw text
  const drawText = (text: string, x: number, y: number, options: { font?: typeof helvetica, size?: number, color?: RGB } = {}) => {
    page.drawText(text || '', {
      x,
      y,
      font: options.font || helvetica,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    })
  }
  
  // Helper to draw a line
  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

      // Title
  drawText('Invoice', margin, yPosition, { font: helveticaBold, size: 24 })

      // Invoice details (top right)
  const invoiceDetailsX = width - margin - 180
  drawText('Invoice No.', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(invoice.invoiceNumber, invoiceDetailsX + 70, yPosition)

  yPosition -= 14
  drawText('Date:', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(invoice.date, invoiceDetailsX + 70, yPosition)

  yPosition -= 14
  drawText('Invoice Due:', invoiceDetailsX, yPosition, { font: helveticaBold })
  drawText(invoice.dueDate, invoiceDetailsX + 70, yPosition)

  yPosition = height - margin - 60

      // FROM section
  drawText('FROM:', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  drawText(invoice.from.name, margin, yPosition)
  yPosition -= 14
  drawText(invoice.from.address, margin, yPosition)
  yPosition -= 14
  drawText(`${invoice.from.state}, ${invoice.from.country}`, margin, yPosition)
  yPosition -= 14
  drawText(invoice.from.email, margin, yPosition)

  yPosition -= 24

      // BILL TO section
  drawText('BILL TO:', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  drawText(invoice.billTo.company, margin, yPosition)
  yPosition -= 14
  drawText(invoice.billTo.address, margin, yPosition)

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
      invoice.items.forEach((item) => {
    // Truncate description if too long
    const description = (item.description || '').substring(0, 50)
    
    drawText(description, margin, yPosition)
    drawText((item.hours || 0).toString(), width - margin - 180, yPosition)
    drawText(`$${(item.rate || 0).toFixed(2)}`, width - margin - 110, yPosition)
    drawText(`$${(item.amount || 0).toFixed(2)}`, width - margin - 40, yPosition)

    yPosition -= 18
      })

      // Divider line before total
  yPosition -= 6
  drawLine(margin, yPosition, width - margin, yPosition)
  yPosition -= 18

      // Total
  const totalX = width - margin - 180
  drawText('Total', totalX, yPosition, { font: helveticaBold, size: 12 })
  drawText(`$${invoice.total.toFixed(2)}`, width - margin - 40, yPosition, { font: helveticaBold, size: 12 })

  yPosition -= 12
  drawLine(totalX, yPosition, width - margin, yPosition)

  yPosition -= 36

      // Banking Information
  drawText('Payable TO:', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  drawText('Bank Information', margin, yPosition, { font: helveticaBold })
  yPosition -= 14
  
  drawText(`Account Holder Name: ${invoice.from?.name || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Bank Name: ${invoice.banking?.bankName || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Bank Address: ${invoice.banking?.bankAddress || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`SWIFT Code: ${invoice.banking?.swiftCode || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Bank Transit: ${invoice.banking?.abaWireRouting || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Account Type: ${invoice.banking?.accountType || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Account Number: ${invoice.banking?.accountNumber || ''}`, margin, yPosition)
  yPosition -= 14
  drawText(`Account Currency: ${invoice.banking?.currency || ''}`, margin, yPosition)

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save()
  
  return Buffer.from(pdfBytes)
    }
