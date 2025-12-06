'use client'

import { Submission } from './types'

interface EmployeeSubmissionsTabProps {
  submissions: Submission[]
}

// Status configuration with both old and new canonical values
const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  // New canonical status values (uppercase)
  SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', label: 'Pending' },
  MANAGER_APPROVED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', label: 'Approved' },
  MANAGER_REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', label: 'Rejected' },
  ADMIN_PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Paid' },
  ADMIN_REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', label: 'Rejected' },
  NEEDS_CLARIFICATION: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', label: 'Clarification' },
  // Legacy status values (for backwards compatibility)
  submitted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', label: 'Pending' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', label: 'Approved' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', label: 'Rejected' },
  payment_done: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Paid' },
  // Fallback
  Submitted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', label: 'Pending' },
  Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Approved' },
  Rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', label: 'Rejected' },
  Paid: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', label: 'Paid' },
}

const defaultStatus = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', label: 'Unknown' }

export function EmployeeSubmissionsTab({ submissions }: EmployeeSubmissionsTabProps) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">No submissions found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Recent Submissions</h3>
      {submissions.map((submission) => {
        const status = statusConfig[submission.status] || defaultStatus
        return (
          <div
            key={submission.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-2"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">{submission.date}</span>
                <span className="text-sm font-medium text-slate-900">
                  {submission.projectName}
                </span>
              </div>
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${status.bg} ${status.text} ${status.border}`}
              >
                {status.label}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-xs text-slate-500 block">Regular Hours</span>
                <span className="text-sm font-semibold text-slate-900">
                  {submission.regularHours}h
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Overtime</span>
                <span className="text-sm font-semibold text-slate-900">
                  {submission.overtimeHours}h
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Total Amount</span>
                <span className="text-sm font-semibold text-slate-900">
                  ${submission.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

