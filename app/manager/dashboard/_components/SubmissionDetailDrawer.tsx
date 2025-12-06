'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Clock, FileText, DollarSign, CheckCircle2, XCircle, MessageCircle, User } from 'lucide-react'
import { format } from 'date-fns'
import type { Submission, SubmissionStatus } from '@/types/domain'
import { getStatusDisplay, getManagerStatusLabel } from '@/lib/submission-status'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
    hourly_rate: number | null
  }
}

interface StatusLogEntry {
  id: string
  actionTitle: string
  timestamp: string
  description: string
  performedBy: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  amount: number
  status: string
}

interface SubmissionDetailDrawerProps {
  submission: SubmissionWithEmployee | null
  isOpen: boolean
  onClose: () => void
}

type TabValue = 'status-log' | 'submission' | 'invoices'

export function SubmissionDetailDrawer({
  submission,
  isOpen,
  onClose,
}: SubmissionDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('status-log')
  const [loading, setLoading] = useState(false)
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Handle ESC key to close drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Load submission details when submission changes
  useEffect(() => {
    if (submission && isOpen) {
      loadSubmissionDetails(submission.id)
    }
  }, [submission, isOpen])

  const loadSubmissionDetails = async (submissionId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/manager/submissions/${submissionId}`)
      
      if (response.ok) {
        const data = await response.json()
        setStatusLog(data.statusLog || [])
        setInvoices(data.invoices || [])
      } else {
        // Generate local status log if API fails
        if (submission) {
          const localLog = generateLocalStatusLog(submission)
          setStatusLog(localLog)
        }
        setInvoices([])
      }
    } catch (error) {
      console.error('Error loading submission details:', error)
      // Generate local status log on error
      if (submission) {
        const localLog = generateLocalStatusLog(submission)
        setStatusLog(localLog)
      }
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const generateLocalStatusLog = (sub: SubmissionWithEmployee): StatusLogEntry[] => {
    const log: StatusLogEntry[] = []
    const submissionDate = format(new Date(sub.submission_date), 'MMM dd, yyyy')
    
    // Current status entry
    const statusDetails: Record<string, { title: string; description: string }> = {
      'SUBMITTED': {
        title: 'Hours Submitted',
        description: `${sub.employee.name} submitted ${sub.hours_submitted} hours${sub.overtime_hours ? ` + ${sub.overtime_hours} overtime` : ''} for ${submissionDate}`,
      },
      'MANAGER_APPROVED': {
        title: 'Approved by Manager',
        description: `Submission for ${submissionDate} has been approved${sub.manager_comment ? `. Comment: "${sub.manager_comment}"` : ''}`,
      },
      'MANAGER_REJECTED': {
        title: 'Rejected by Manager',
        description: `Submission for ${submissionDate} was rejected${sub.manager_comment ? `. Reason: "${sub.manager_comment}"` : ''}`,
      },
      'ADMIN_PAID': {
        title: 'Payment Processed',
        description: `Payment for submission on ${submissionDate} has been processed`,
      },
      'ADMIN_REJECTED': {
        title: 'Rejected by Admin',
        description: `Submission for ${submissionDate} was rejected by admin${sub.admin_comment ? `. Reason: "${sub.admin_comment}"` : ''}`,
      },
      'NEEDS_CLARIFICATION': {
        title: 'Clarification Requested',
        description: `Admin requested clarification for submission on ${submissionDate}${sub.admin_comment ? `. Message: "${sub.admin_comment}"` : ''}`,
      },
    }

    const details = statusDetails[sub.status] || {
      title: 'Status Updated',
      description: `Submission status: ${sub.status}`,
    }

    log.push({
      id: `${sub.id}-current`,
      actionTitle: details.title,
      timestamp: format(new Date(sub.updated_at), 'MM/dd/yyyy, hh:mm a'),
      description: details.description,
      performedBy: sub.status === 'SUBMITTED' ? sub.employee.name : 'Manager/Admin',
    })

    // Add creation entry if different from current
    if (sub.created_at !== sub.updated_at) {
      log.push({
        id: `${sub.id}-created`,
        actionTitle: 'Hours Submitted',
        timestamp: format(new Date(sub.created_at), 'MM/dd/yyyy, hh:mm a'),
        description: `${sub.employee.name} submitted ${sub.hours_submitted} hours for ${submissionDate}`,
        performedBy: sub.employee.name,
      })
    }

    return log
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!submission) return null

  const tabs = [
    { value: 'status-log' as TabValue, label: 'Status Log' },
    { value: 'submission' as TabValue, label: 'Submission' },
    { value: 'invoices' as TabValue, label: 'Invoices' },
  ]

  const statusDisplay = getStatusDisplay(submission.status)
  const totalHours = submission.hours_submitted + (submission.overtime_hours || 0)
  const totalAmount = totalHours * (submission.employee.hourly_rate || 0)

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-[560px] bg-white shadow-2xl rounded-l-3xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-semibold text-indigo-700 shrink-0">
              {submission.employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>

            {/* Text info */}
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-900">{submission.employee.name}</h2>
              <p className="text-sm text-slate-500">{submission.employee.email}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusDisplay.bgClass} ${statusDisplay.textClass}`}>
                  {getManagerStatusLabel(submission.status)}
                </span>
                <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                  {format(new Date(submission.submission_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="inline-flex rounded-full bg-slate-100 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-1.5 text-sm rounded-full transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-white text-slate-900 font-medium shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'status-log' && (
                <StatusLogTab entries={statusLog} />
              )}
              {activeTab === 'submission' && (
                <SubmissionDetailsTab submission={submission} totalAmount={totalAmount} />
              )}
              {activeTab === 'invoices' && (
                <InvoicesTab invoices={invoices} submission={submission} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// Status Log Tab Component
function StatusLogTab({ entries }: { entries: StatusLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No activity log entries found.</p>
      </div>
    )
  }

  const getActivityStyle = (actionTitle: string) => {
    const title = actionTitle.toLowerCase()
    
    if (title.includes('approved')) {
      return { icon: CheckCircle2, bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-100' }
    }
    if (title.includes('rejected')) {
      return { icon: XCircle, bg: 'bg-red-500', bgLight: 'bg-red-50', border: 'border-red-100' }
    }
    if (title.includes('payment') || title.includes('paid')) {
      return { icon: DollarSign, bg: 'bg-blue-500', bgLight: 'bg-blue-50', border: 'border-blue-100' }
    }
    if (title.includes('clarification')) {
      return { icon: MessageCircle, bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-100' }
    }
    return { icon: Clock, bg: 'bg-indigo-500', bgLight: 'bg-indigo-50', border: 'border-indigo-100' }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Activity & Status Log</h3>
      
      <div className="relative">
        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
        
        <div className="space-y-0">
          {entries.map((entry, index) => {
            const style = getActivityStyle(entry.actionTitle)
            const IconComponent = style.icon
            
            return (
              <div key={entry.id} className={`relative pl-10 ${index !== entries.length - 1 ? 'pb-5' : ''}`}>
                <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${style.bg} border-[3px] border-white shadow-sm flex items-center justify-center`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                
                <div className={`rounded-xl border ${style.border} ${style.bgLight} px-4 py-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{entry.actionTitle}</span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{entry.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{entry.description}</p>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[10px] font-medium text-slate-600">
                      {entry.performedBy.charAt(0).toUpperCase()}
                    </span>
                    {entry.performedBy}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Submission Details Tab Component
function SubmissionDetailsTab({ 
  submission, 
  totalAmount 
}: { 
  submission: SubmissionWithEmployee
  totalAmount: number 
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-900">Submission Details</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Regular Hours</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{submission.hours_submitted}h</p>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Overtime Hours</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{submission.overtime_hours || 0}h</p>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-emerald-600">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            @ ${submission.employee.hourly_rate || 0}/hr
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Work Description</h4>
        <p className="text-sm text-slate-600">{submission.description || 'No description provided.'}</p>
      </div>

      {/* Overtime Description */}
      {submission.overtime_hours && submission.overtime_hours > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h4 className="text-sm font-medium text-amber-700 mb-2">Overtime Description</h4>
          <p className="text-sm text-amber-600">{submission.overtime_description || 'No overtime description provided.'}</p>
        </div>
      )}

      {/* Comments */}
      {submission.manager_comment && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-700 mb-2">Manager Comment</h4>
          <p className="text-sm text-blue-600">{submission.manager_comment}</p>
        </div>
      )}

      {submission.admin_comment && (
        <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
          <h4 className="text-sm font-medium text-violet-700 mb-2">Admin Comment</h4>
          <p className="text-sm text-violet-600">{submission.admin_comment}</p>
        </div>
      )}

      {/* Employee Info */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Employee Information</h4>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{submission.employee.name}</p>
            <p className="text-xs text-slate-500">{submission.employee.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Invoices Tab Component
function InvoicesTab({ 
  invoices, 
  submission 
}: { 
  invoices: Invoice[]
  submission: SubmissionWithEmployee 
}) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No invoices generated yet.</p>
        <p className="text-xs text-slate-400 mt-1">Invoices are created when submissions are approved.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Pending': 'bg-amber-50 text-amber-700 border-amber-100',
    'Overdue': 'bg-red-50 text-red-700 border-red-100',
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Related Invoices</h3>
      
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500">Issued: {invoice.issueDate}</p>
            </div>
            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[invoice.status] || 'bg-slate-50 text-slate-700'}`}>
              {invoice.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Due Date</p>
              <p className="text-sm font-medium text-slate-700">{invoice.dueDate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Amount</p>
              <p className="text-lg font-bold text-emerald-600">
                ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

