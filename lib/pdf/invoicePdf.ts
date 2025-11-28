import PDFDocument from 'pdfkit'
import type { Invoice } from '@/types/domain'

/**
 * Generates an invoice PDF using PDFKit
 * Returns a Buffer that can be used to create a Blob or sent as a response
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
      const chunks: Buffer[] = []

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Set up fonts and layout
      const pageWidth = 612 // Letter size width in points (8.5 inches * 72)
      const margin = 50
      let yPosition = margin

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text('Invoice', margin, yPosition)
      yPosition += 30

      // Invoice details (top right)
      const invoiceDetailsX = pageWidth - margin - 150
      yPosition = margin
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Invoice No.', invoiceDetailsX, yPosition)
        .font('Helvetica')
        .text(invoice.invoiceNumber, invoiceDetailsX + 60, yPosition)

      yPosition += 12
      doc
        .font('Helvetica-Bold')
        .text('Date:', invoiceDetailsX, yPosition)
        .font('Helvetica')
        .text(invoice.date, invoiceDetailsX + 60, yPosition)

      yPosition += 12
      doc
        .font('Helvetica-Bold')
        .text('Invoice Due:', invoiceDetailsX, yPosition)
        .font('Helvetica')
        .text(invoice.dueDate, invoiceDetailsX + 60, yPosition)

      yPosition = margin + 50

      // FROM section
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('FROM:', margin, yPosition)
      yPosition += 12
      doc
        .font('Helvetica')
        .text(invoice.from.name, margin, yPosition)
      yPosition += 12
      doc.text(invoice.from.address, margin, yPosition)
      yPosition += 12
      doc.text(`${invoice.from.state}, ${invoice.from.country}`, margin, yPosition)
      yPosition += 12
      doc.text(invoice.from.email, margin, yPosition)

      yPosition += 20

      // BILL TO section
      doc.font('Helvetica-Bold').text('BILL TO:', margin, yPosition)
      yPosition += 12
      doc.font('Helvetica').text(invoice.billTo.company, margin, yPosition)
      yPosition += 12
      doc.text(invoice.billTo.address, margin, yPosition)

      yPosition += 20

      // Divider line
      doc.moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke()
      yPosition += 15

      // Items table header
      doc.font('Helvetica-Bold').fontSize(10)
      doc.text('Description', margin, yPosition)
      doc.text('Hours', pageWidth - margin - 150, yPosition, { align: 'right' })
      doc.text('Rate', pageWidth - margin - 100, yPosition, { align: 'right' })
      doc.text('Amount', pageWidth - margin, yPosition, { align: 'right' })

      yPosition += 10
      doc.moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke()
      yPosition += 15

      // Items
      doc.font('Helvetica').fontSize(10)
      invoice.items.forEach((item) => {
        // Check if we need a new page
        if (yPosition > 750) {
          doc.addPage()
          yPosition = margin
        }

        // Wrap description text if needed
        const maxDescriptionWidth = pageWidth - margin - 300
        const descriptionLines = doc.heightOfString(item.description, {
          width: maxDescriptionWidth,
        })
        const descriptionHeight = Math.max(descriptionLines, 12)

        doc.text(item.description, margin, yPosition, {
          width: maxDescriptionWidth,
        })

        const itemY = yPosition
        doc.text(item.hours.toString(), pageWidth - margin - 150, itemY, {
          align: 'right',
        })
        doc.text(`$${item.rate.toFixed(2)}`, pageWidth - margin - 100, itemY, {
          align: 'right',
        })
        doc.text(`$${item.amount.toFixed(2)}`, pageWidth - margin, itemY, {
          align: 'right',
        })

        yPosition += descriptionHeight + 5
      })

      // Divider line before total
      yPosition += 10
      doc.moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke()
      yPosition += 15

      // Total
      const totalX = pageWidth - margin - 150
      doc.font('Helvetica-Bold').fontSize(12)
      doc.text('Total', totalX, yPosition)
      doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin, yPosition, {
        align: 'right',
      })

      yPosition += 10
      doc.moveTo(totalX, yPosition).lineTo(pageWidth - margin, yPosition).stroke()

      yPosition += 30

      // Banking Information
      doc.font('Helvetica-Bold').fontSize(10)
      doc.text('Payable TO:', margin, yPosition)
      yPosition += 12
      doc.text('Bank Information', margin, yPosition)
      yPosition += 12

      doc.font('Helvetica').fontSize(10)
      doc.text(`Account Holder Name: ${invoice.from.name || ''}`, margin, yPosition)
      yPosition += 12
      doc.text(
        `Bank Name: ${invoice.banking?.bankName || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `Bank Address: ${invoice.banking?.bankAddress || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `SWIFT Code: ${invoice.banking?.swiftCode || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `Bank Transit: ${invoice.banking?.abaWireRouting || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `Account Type: ${invoice.banking?.accountType || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `Account Number: ${invoice.banking?.accountNumber || ''}`,
        margin,
        yPosition
      )
      yPosition += 12
      doc.text(
        `Account Currency: ${invoice.banking?.currency || ''}`,
        margin,
        yPosition
      )

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

