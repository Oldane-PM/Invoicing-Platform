'use client'

import { useState } from 'react'
import { Paperclip, ChevronDown, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { Submission } from '@/types/domain'
import { ConfirmationModal } from './ConfirmationModal'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
  }
}

interface SubmissionTableProps {
  submissions: SubmissionWithEmployee[]
  managerId: string
  onActionComplete: () => void
}

export function SubmissionTable({
  submissions,
  managerId,
  onActionComplete,
}: SubmissionTableProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithEmployee | null>(null)
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleActionSelect = (
    submission: SubmissionWithEmployee,
    action: 'approve' | 'reject'
  ) => {
    // Only allow actions on 'submitted' status
    if (submission.status !== 'submitted') {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
      case 'payment_done':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Payment Done
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        )
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(submission.submission_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.employee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.employee.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(submission as any).hours_submitted || (submission as any).hoursSubmitted || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(submission as any).overtime_hours ?? (submission as any).overtimeHours ?? '—'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {submission.status === 'submitted' ? (
                        <div className="relative">
                          <select
                            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            onChange={(e) => {
                              const action = e.target.value as 'approve' | 'reject' | ''
                              if (action) {
                                handleActionSelect(submission, action)
                                e.target.value = ''
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="">Select action</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      ) : (
                        getStatusBadge(submission.status)
                      )}
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

