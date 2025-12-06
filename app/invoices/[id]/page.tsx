'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { getInvoiceWithItems } from '@/lib/supabase/queries/invoices'

interface InvoiceItem {
  description: string
  hours: number
  rate: number
  amount: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  from: {
    name: string
    address: string
    state: string
    country: string
    email: string
  }
  billTo: {
    company: string
    address: string
  }
  items: InvoiceItem[]
  total: number
  banking: {
    bankName: string
    bankAddress: string
    swiftCode: string
    abaWireRouting: string
    accountType: string
    currency: string
    accountNumber: string
  }
}

export default function InvoiceView() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadInvoice(params.id as string)
    }
  }, [params.id])

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true)
      const invoiceData = await getInvoiceWithItems(invoiceId)
      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error loading invoice:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-500">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-500">Invoice not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Printer className="w-5 h-5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 print:shadow-none print:p-4">
          {/* Header */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Invoice</h1>

          {/* From and Invoice Details */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="font-bold text-gray-900 mb-2">FROM:</p>
              <p className="text-gray-700">{invoice.from.name}</p>
              <p className="text-gray-700">{invoice.from.address}</p>
              <p className="text-gray-700">
                {invoice.from.state}, {invoice.from.country}
              </p>
              <p className="text-gray-700">{invoice.from.email}</p>
            </div>
            <div className="text-right">
              <p className="mb-2">
                <span className="font-bold text-gray-900">Invoice No.</span>{' '}
                <span className="text-gray-700">{invoice.invoiceNumber}</span>
              </p>
              <p className="mb-2">
                <span className="font-bold text-gray-900">Date:</span>{' '}
                <span className="text-gray-700">{invoice.date}</span>
              </p>
              <p>
                <span className="font-bold text-gray-900">Invoice Due:</span>{' '}
                <span className="text-gray-700">{invoice.dueDate}</span>
              </p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="font-bold text-gray-900 mb-2">BILL TO:</p>
            <p className="text-gray-700">{invoice.billTo.company}</p>
            <p className="text-gray-700">{invoice.billTo.address}</p>
          </div>

          {/* Divider */}
          <hr className="border-gray-300 mb-6" />

          {/* Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-bold text-gray-900">Description</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Hours</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Rate</th>
                <th className="text-right py-3 px-4 font-bold text-gray-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3 px-4 text-gray-700">{item.description}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.hours}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Divider */}
          <hr className="border-gray-300 mb-4" />

          {/* Total */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="font-bold text-gray-900 text-lg">
                  ${invoice.total.toFixed(2)}
                </span>
              </div>
              <hr className="border-gray-300" />
            </div>
          </div>

          {/* Banking Information */}
          <div className="mt-8">
            <p className="font-bold text-gray-900 mb-2">Payable TO:</p>
            <p className="font-bold text-gray-900 mb-2">Bank Information</p>
            <div className="space-y-1 text-gray-700">
              <p>
                <span className="font-semibold">Account Holder Name:</span> {invoice.from.name}
              </p>
              <p>
                <span className="font-semibold">Bank Name:</span> {invoice.banking.bankName}
              </p>
              <p>
                <span className="font-semibold">Bank Address:</span> {invoice.banking.bankAddress}
              </p>
              <p>
                <span className="font-semibold">SWIFT Code:</span> {invoice.banking.swiftCode}
              </p>
              <p>
                <span className="font-semibold">Bank Transit:</span>{' '}
                {invoice.banking.abaWireRouting}
              </p>
              <p>
                <span className="font-semibold">Account Type:</span> {invoice.banking.accountType}
              </p>
              <p>
                <span className="font-semibold">Account Number:</span>{' '}
                {invoice.banking.accountNumber}
              </p>
              <p>
                <span className="font-semibold">Account Currency:</span> {invoice.banking.currency}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

