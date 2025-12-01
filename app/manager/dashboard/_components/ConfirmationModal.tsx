'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import type { Submission } from '@/types/domain'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
  }
}

interface ConfirmationModalProps {
  action: 'approve' | 'reject'
  submission: SubmissionWithEmployee
  onConfirm: (rejectionReason?: string) => void
  onCancel: () => void
  loading: boolean
}

export function ConfirmationModal({
  action,
  submission,
  onConfirm,
  onCancel,
  loading,
}: ConfirmationModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (action === 'reject' && !rejectionReason.trim()) {
      return
    }
    onConfirm(action === 'reject' ? rejectionReason : undefined)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-primary-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Confirm Action</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {action === 'approve'
                ? 'Are you sure you want to approve this submission?'
                : 'Are you sure you want to reject this submission?'}
            </p>
          </div>

          {action === 'reject' && (
            <div className="mb-4">
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter the reason for rejection..."
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (action === 'reject' && !rejectionReason.trim())}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 ${
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

