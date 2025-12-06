'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, ChevronDown, CheckCircle2, XCircle, MoreHorizontal, AlertTriangle, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { Submission, SubmissionStatus } from '@/types/domain'
import { ConfirmationModal } from './ConfirmationModal'
import { managerCanApprove, managerCanReject, getStatusDisplay, getManagerStatusLabel } from '@/lib/submission-status'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
    hourly_rate: number | null
  }
}

interface SubmissionTableProps {
  submissions: SubmissionWithEmployee[]
  managerId: string
  onActionComplete: () => void
  onRowClick?: (submission: SubmissionWithEmployee) => void
}

export function SubmissionTable({
  submissions,
  managerId,
  onActionComplete,
  onRowClick,
}: SubmissionTableProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithEmployee | null>(null)
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const handleMenuToggle = (submissionId: string, buttonEl: HTMLButtonElement | null) => {
    if (openMenuId === submissionId) {
      setOpenMenuId(null)
      setMenuPosition(null)
    } else if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160, // 160px is menu width (w-40)
      })
      setOpenMenuId(submissionId)
    }
  }

  const handleActionSelect = (
    submission: SubmissionWithEmployee,
    action: 'approve' | 'reject'
  ) => {
    // Use centralized status helpers
    if (action === 'approve' && !managerCanApprove(submission.status)) {
      return
    }
    if (action === 'reject' && !managerCanReject(submission.status)) {
      return
    }

    setSelectedSubmission(submission)
    setSelectedAction(action)
    setShowModal(true)
  }

  const handleConfirmAction = async (rejectionReason?: string) => {
    if (!selectedSubmission || !selectedAction) return

    setLoading(true)
    try {
      const endpoint =
        selectedAction === 'approve'
          ? `/api/submissions/${selectedSubmission.id}/approve`
          : `/api/submissions/${selectedSubmission.id}/reject`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId,
          rejectionReason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process action')
      }

      // Close modal and refresh data
      setShowModal(false)
      setSelectedSubmission(null)
      setSelectedAction(null)
      onActionComplete()
    } catch (error) {
      console.error('Error processing action:', error)
      alert('Failed to process action. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewInvoice = (invoiceId: string | null) => {
    if (!invoiceId) return
    window.open(`/invoices/${invoiceId}`, '_blank')
  }

  const getStatusBadge = (status: SubmissionStatus) => {
    const display = getStatusDisplay(status)
    const label = getManagerStatusLabel(status)
    
    const getIcon = () => {
    switch (status) {
        case 'MANAGER_APPROVED':
        case 'ADMIN_PAID':
          return <CheckCircle2 className="w-3 h-3 mr-1" />
        case 'MANAGER_REJECTED':
        case 'ADMIN_REJECTED':
          return <XCircle className="w-3 h-3 mr-1" />
        case 'NEEDS_CLARIFICATION':
          return <MessageCircle className="w-3 h-3 mr-1" />
      default:
          return null
      }
    }
    
        return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${display.bgClass} ${display.textClass}`}>
        {getIcon()}
        {label}
          </span>
        )
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Overtime Hours
                </th>
                <th className="px-6 py-3 text-right text-[14px] font-semibold text-slate-700">
                  Invoice Amount ($)
                </th>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr 
                    key={submission.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onRowClick?.(submission)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {format(new Date(submission.submission_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {submission.employee.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {submission.employee.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {(submission as any).hours_submitted || (submission as any).hoursSubmitted || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {(submission as any).overtime_hours ?? (submission as any).overtimeHours ?? '—'}
                    </td>
                    {/* Invoice Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-600">
                      {(() => {
                        const hours = (submission as any).hours_submitted || (submission as any).hoursSubmitted || 0
                        const overtime = (submission as any).overtime_hours ?? (submission as any).overtimeHours ?? 0
                        const totalHours = hours + overtime
                        const rate = submission.employee?.hourly_rate || 0
                        const total = totalHours * rate
                        return total > 0
                          ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {((submission as any).invoice_id || (submission as any).invoiceId) ? (
                        <button
                          onClick={() => handleViewInvoice((submission as any).invoice_id || (submission as any).invoiceId)}
                          className="inline-flex items-center text-primary-600 hover:text-primary-700"
                        >
                          <Paperclip className="w-4 h-4 mr-1" />
                          View PDF
                        </button>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const canApprove = managerCanApprove(submission.status)
                        const canReject = managerCanReject(submission.status)
                        const showActions = canApprove || canReject
                        
                        if (!showActions) {
                          return getStatusBadge(submission.status)
                        }
                        
                        return (
                          <div className="relative inline-block text-left">
                            <button
                              ref={(el) => {
                                if (el) buttonRefs.current.set(submission.id, el)
                              }}
                              type="button"
                              onClick={(e) => handleMenuToggle(submission.id, e.currentTarget)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              aria-label="Open actions menu"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openMenuId === submission.id && menuPosition && typeof document !== 'undefined' && createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setMenuPosition(null)
                                  }}
                                />
                                <div 
                                  className="fixed w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-[9999] py-1"
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                >
                                  {/* Approve button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                      handleActionSelect(submission, 'approve')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Approve
                                  </button>
                                  {/* Reject button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                      handleActionSelect(submission, 'reject')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                  </button>
                        </div>
                              </>,
                              document.body
                      )}
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedSubmission && selectedAction && (
        <ConfirmationModal
          action={selectedAction}
          submission={selectedSubmission}
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setShowModal(false)
            setSelectedSubmission(null)
            setSelectedAction(null)
          }}
          loading={loading}
        />
      )}
    </>
  )
}

