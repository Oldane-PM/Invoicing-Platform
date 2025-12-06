'use client'

import { useState, useEffect } from 'react'
import { X, Send, User, Clock, Mail } from 'lucide-react'

type RequestClarificationDialogProps = {
  open: boolean
  onClose: () => void
  onSend: (message: string) => void
  employee: {
    name: string
    email: string
    regularHours: number
    overtimeHours: number
  } | null
  managerName: string
}

export function RequestClarificationDialog({
  open,
  onClose,
  onSend,
  employee,
  managerName,
}: RequestClarificationDialogProps) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMessage('')
      setError('')
    }
  }, [open])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleSend = () => {
    if (message.trim().length === 0) {
      setError('Please enter a message before sending.')
      return
    }
    setError('')
    onSend(message.trim())
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-xl max-w-[640px] w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Request Clarification
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Send a message to {managerName} about {employee?.name}'s submission
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors -mr-2 -mt-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Employee Summary Card */}
          {employee && (
            <div className="mx-6 mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700 shrink-0">
                {getInitials(employee.name)}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-slate-900 truncate">
                  {employee.name}
                </span>
                <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {employee.email}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {employee.regularHours}h regular • {employee.overtimeHours}h overtime
                </span>
              </div>
            </div>
          )}

          {/* Message Area */}
          <div className="px-6 pb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Message to Manager
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (error) setError('')
              }}
              placeholder="What clarification do you need from the manager? Please provide specific details..."
              className={`w-full min-h-[160px] rounded-xl border ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-violet-500'
              } px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all`}
            />
            {error ? (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                This message will be sent to {managerName} for review
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Clarification
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

