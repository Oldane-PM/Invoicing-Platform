'use client'

import { Download } from 'lucide-react'
import { Invoice } from './types'

interface EmployeeInvoicesTabProps {
  invoices: Invoice[]
}

const statusConfig = {
  Paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  Pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  Overdue: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
}

export function EmployeeInvoicesTab({ invoices }: EmployeeInvoicesTabProps) {
  const handleDownload = (invoiceNumber: string) => {
    console.log(`Downloading invoice: ${invoiceNumber}`)
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">No invoices found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Invoice History</h3>
      {invoices.map((invoice) => {
        const status = statusConfig[invoice.status]
        return (
          <div
            key={invoice.id}
            className="rounded-2xl border border-slate-100 bg-white px-4 py-4 flex flex-col gap-3"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  {invoice.invoiceNumber}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Issued: {invoice.issueDate}
                </span>
              </div>
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${status.bg} ${status.text} ${status.border}`}
              >
                {invoice.status}
              </span>
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-2 gap-4 py-2 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-500 block">Amount</span>
                <span className="text-lg font-semibold text-slate-900">
                  ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Due Date</span>
                <span className="text-sm font-medium text-slate-900">{invoice.dueDate}</span>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex justify-end pt-1 border-t border-slate-100">
              <button
                onClick={() => handleDownload(invoice.invoiceNumber)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

