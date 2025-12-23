'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, Calendar, Clock, FileText, AlertCircle, Loader2, Lock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { employeeCanEdit, getStatusDisplay, getEmployeeStatusLabel } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'
import type { SubmissionFrontend } from '@/lib/utils/dataTransform'

// Alias for clarity
type Submission = SubmissionFrontend

interface BlockedDay {
  date: string
  type: 'HOLIDAY' | 'SPECIAL_DAY_OFF'
  name: string
  reason: string
}

interface SubmissionEditDrawerProps {
  submission: Submission | null
  isOpen: boolean
  onClose: () => void
  onSave: (submission: Submission) => Promise<{ success: boolean; error?: string }>
  employeeId: string
  hourlyRate: number | null
}

export function SubmissionEditDrawer({
  submission,
  isOpen,
  onClose,
  onSave,
  employeeId,
  hourlyRate,
}: SubmissionEditDrawerProps) {
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    hoursSubmitted: 0,
    overtimeHours: 0,
    description: '',
    overtimeDescription: '',
  })
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([])
  const [hasBlockedDateConflict, setHasBlockedDateConflict] = useState(false)
  const [feedbackExpanded, setFeedbackExpanded] = useState(true)

  // Initialize form when submission changes
  useEffect(() => {
    if (submission) {
      setFormData({
        date: submission.date,
        hoursSubmitted: submission.hoursSubmitted,
        overtimeHours: submission.overtimeHours || 0,
        description: submission.description || '',
        overtimeDescription: submission.overtimeDescription || '',
      })
      setError(null)
      setFieldErrors({})
      
      // Fetch blocked days and check for conflicts
      checkForBlockedDateConflicts(submission.date)
    }
  }, [submission, employeeId])

  // Check if submission date overlaps with blocked days
  const checkForBlockedDateConflicts = async (submissionDate: string) => {
    if (!employeeId || !submissionDate) return
    
    try {
      const date = new Date(submissionDate)
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      
      const params = new URLSearchParams({
        employeeId,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        employeeType: 'employee',
      })
      
      const response = await fetch(`/api/employee/calendar/blocked-days?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        const blocked = data.blockedDays || []
        setBlockedDays(blocked)
        
        // Check if submission date is blocked
        const subDateStr = date.toISOString().split('T')[0]
        const isBlocked = blocked.some((b: BlockedDay) => b.date === subDateStr)
        setHasBlockedDateConflict(isBlocked)
      }
    } catch (error) {
      console.error('Error checking blocked days:', error)
    }
  }

  // Get blocked day info for the submission date
  const getBlockedDayInfo = (): BlockedDay | null => {
    if (!formData.date || blockedDays.length === 0) return null
    const subDateStr = new Date(formData.date).toISOString().split('T')[0]
    return blockedDays.find(b => b.date === subDateStr) || null
  }

  // Handle ESC key
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

  // Prevent body scroll when open
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

  const canEdit = employeeCanEdit(submission.status)
  const statusDisplay = getStatusDisplay(submission.status as SubmissionStatus)
  const statusLabel = getEmployeeStatusLabel(submission.status as SubmissionStatus)

  // Get month/year for display
  const submissionDate = new Date(submission.date)
  const monthYear = format(submissionDate, 'MMMM yyyy')

  // Calculate totals
  const totalHours = formData.hoursSubmitted + formData.overtimeHours
  const totalAmount = totalHours * (hourlyRate || 0)

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    setError(null)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.date) {
      errors.date = 'Submission date is required'
    }

    if (formData.hoursSubmitted <= 0) {
      errors.hoursSubmitted = 'Hours must be greater than 0'
    }

    if (formData.hoursSubmitted > 744) {
      // Max hours in a month
      errors.hoursSubmitted = 'Hours cannot exceed 744 (31 days × 24 hours)'
    }

    if (formData.overtimeHours < 0) {
      errors.overtimeHours = 'Overtime hours cannot be negative'
    }

    if (!formData.description.trim()) {
      errors.description = 'Work description is required'
    }

    if (formData.overtimeHours > 0 && !formData.overtimeDescription.trim()) {
      errors.overtimeDescription = 'Overtime description is required when overtime hours are entered'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    // Prevent double-clicks
    if (saving) return
    if (!canEdit) return
    
    // Prevent saving if blocked date conflict
    if (hasBlockedDateConflict) {
      setError('Cannot save: This submission includes a date blocked by Admin.')
      return
    }
    
    if (!validateForm()) return

    setSaving(true)
    setError(null)

    try {
      const updatedSubmission: Submission = {
        ...submission,
        date: formData.date,
        hoursSubmitted: formData.hoursSubmitted,
        overtimeHours: formData.overtimeHours,
        description: formData.description,
        overtimeDescription: formData.overtimeDescription || null,
      }

      const result = await onSave(updatedSubmission)

      if (!result.success) {
        if (result.error?.includes('duplicate') || result.error?.includes('already have a submission')) {
          const monthYear = format(new Date(formData.date), 'MMMM yyyy')
          setFieldErrors({
            date: `You already have a submission for ${monthYear}. Please edit that submission instead.`,
          })
        } else {
          setError(result.error || 'Failed to save submission')
        }
      }
      // onSave handler will close the drawer on success
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!submission.invoiceId) {
      setError('No invoice available for download')
      return
    }

    setDownloading(true)
    try {
      const response = await fetch(`/api/invoices/${submission.invoiceId}/pdf`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${format(submissionDate, 'yyyy-MM')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Unable to download PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // Show rejection banner if applicable
  const showRejectionBanner =
    submission.status === 'MANAGER_REJECTED' || submission.status === 'ADMIN_REJECTED'
  const rejectionComment =
    submission.status === 'MANAGER_REJECTED'
      ? submission.managerComment
      : submission.adminComment

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
        className={`fixed right-0 top-0 h-screen w-full max-w-[560px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">
                  Submission for {monthYear}
                </h2>
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusDisplay.bgClass} ${statusDisplay.textClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {canEdit ? 'Edit your submission details below' : 'View submission details'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading || !submission.invoiceId}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Reviewer Feedback Card - Only shown for rejected submissions */}
          {showRejectionBanner && rejectionComment && (
            <div className="mb-6 bg-rose-50/70 border-l-4 border-rose-400 rounded-r-lg overflow-hidden">
              {/* Card Header */}
              <button
                type="button"
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium text-rose-800">Reviewer Feedback</span>
                </div>
                {feedbackExpanded ? (
                  <ChevronUp className="w-4 h-4 text-rose-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-rose-500" />
                )}
              </button>

              {/* Card Content - Collapsible */}
              {feedbackExpanded && (
                <div className="px-4 pb-4">
                  {/* Divider */}
                  <div className="border-t border-rose-200/60 mb-3" />
                  
                  {/* Reason Label */}
                  <p className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-1.5">
                    Reason
                  </p>
                  
                  {/* Feedback Text - Constrained with overflow handling */}
                  <div 
                    className="text-sm text-rose-800 max-h-32 overflow-y-auto pr-2"
                    style={{ 
                      wordBreak: 'break-word', 
                      overflowWrap: 'anywhere',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#fecaca transparent'
                    }}
                  >
                    {rejectionComment}
                  </div>

                  {/* Action hint */}
                  <p className="mt-3 text-xs text-rose-600 flex items-center gap-1.5 pt-2 border-t border-rose-200/40">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please update your submission and resubmit.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Blocked Date Warning Banner */}
          {hasBlockedDateConflict && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    ⚠️ This submission includes a blocked date
                  </p>
                  {(() => {
                    const blockedInfo = getBlockedDayInfo()
                    return blockedInfo ? (
                      <p className="text-sm text-amber-700 mt-1">
                        <strong>{blockedInfo.name}</strong> ({blockedInfo.type === 'HOLIDAY' ? 'Holiday' : 'Special Day Off'}) 
                        on {format(new Date(blockedInfo.date), 'EEE, MMM d, yyyy')} is now marked as non-working by Admin.
                      </p>
                    ) : null
                  })()}
                  <p className="text-xs text-amber-600 mt-2">
                    You cannot save this submission until the date is changed or the blocked day is removed by Admin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Card */}
          <div className="mb-6 p-4 bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-teal-600 font-medium">Total Hours</p>
                <p className="text-2xl font-bold text-teal-700">{totalHours}h</p>
              </div>
              <div>
                <p className="text-xs text-teal-600 font-medium">Rate</p>
                <p className="text-2xl font-bold text-teal-700">${hourlyRate || 0}/hr</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total Amount</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Submission Period */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Submission Period <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm transition-colors ${
                    fieldErrors.date
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                  } ${!canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
              {fieldErrors.date && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.date}
                </p>
              )}
            </div>

            {/* Hours Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Regular Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Regular Hours <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    max="744"
                    step="0.5"
                    value={formData.hoursSubmitted}
                    onChange={(e) =>
                      handleInputChange('hoursSubmitted', parseFloat(e.target.value) || 0)
                    }
                    disabled={!canEdit}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm transition-colors ${
                      fieldErrors.hoursSubmitted
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                    } ${!canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                </div>
                {fieldErrors.hoursSubmitted && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.hoursSubmitted}</p>
                )}
              </div>

              {/* Overtime Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Overtime Hours
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    value={formData.overtimeHours}
                    onChange={(e) =>
                      handleInputChange('overtimeHours', parseFloat(e.target.value) || 0)
                    }
                    disabled={!canEdit}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm transition-colors ${
                      fieldErrors.overtimeHours
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                    } ${!canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                </div>
                {fieldErrors.overtimeHours && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.overtimeHours}</p>
                )}
              </div>
            </div>

            {/* Work Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Work Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Describe the work completed during this period..."
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm resize-none transition-colors ${
                    fieldErrors.description
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                  } ${!canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
              {fieldErrors.description && (
                <p className="mt-1.5 text-sm text-red-600">{fieldErrors.description}</p>
              )}
            </div>

            {/* Overtime Description */}
            {(formData.overtimeHours > 0 || formData.overtimeDescription) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Overtime Description {formData.overtimeHours > 0 && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={formData.overtimeDescription}
                  onChange={(e) => handleInputChange('overtimeDescription', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Describe the overtime work..."
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm resize-none transition-colors ${
                    fieldErrors.overtimeDescription
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                  } ${!canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {fieldErrors.overtimeDescription && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.overtimeDescription}</p>
                )}
              </div>
            )}

            {/* Manager/Admin Comments (Read-only) - Only show if not already shown in rejection feedback */}
            {submission.managerComment && submission.status !== 'MANAGER_REJECTED' && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <h4 className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1.5">Manager Comment</h4>
                <div 
                  className="text-sm text-blue-800 max-h-28 overflow-y-auto"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {submission.managerComment}
                </div>
              </div>
            )}

            {submission.adminComment && submission.status !== 'ADMIN_REJECTED' && (
              <div className="p-4 bg-violet-50 border-l-4 border-violet-400 rounded-r-lg">
                <h4 className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-1.5">Admin Comment</h4>
                <div 
                  className="text-sm text-violet-800 max-h-28 overflow-y-auto"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {submission.adminComment}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || hasBlockedDateConflict}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  hasBlockedDateConflict 
                    ? 'bg-amber-500 cursor-not-allowed' 
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
                title={hasBlockedDateConflict ? 'Cannot save - submission contains blocked dates' : undefined}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {hasBlockedDateConflict && <Lock className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : hasBlockedDateConflict ? 'Blocked Date' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

